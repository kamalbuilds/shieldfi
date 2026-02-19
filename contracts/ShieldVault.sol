// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title IPancakeV3SwapRouter
 * @notice Minimal interface for PancakeSwap V3 SwapRouter exactInputSingle.
 */
interface IPancakeV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/**
 * @title ShieldVault
 * @notice A vault where users deposit funds that the ShieldFi AI agent can use for protective actions.
 * @dev Users deposit BNB or ERC20 tokens. The authorized agent can execute swaps via PancakeSwap V3
 *      to protect user positions (e.g., swapping collateral to repay loans on Venus Protocol).
 */
contract ShieldVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice BNB deposits per user
    mapping(address => uint256) public deposits;

    /// @notice ERC20 token deposits: user => token => amount
    mapping(address => mapping(address => uint256)) public tokenDeposits;

    /// @notice The authorized ShieldFi AI agent address
    address public shieldAgent;

    /// @notice Wrapped BNB address on BSC
    address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    /// @notice Default swap fee tier for PancakeSwap V3 (0.25%)
    uint24 public constant DEFAULT_FEE = 2500;

    event Deposited(address indexed user, uint256 amount);
    event TokenDeposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event TokenWithdrawn(address indexed user, address indexed token, uint256 amount);
    event ProtectionExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);

    modifier onlyAgent() {
        require(msg.sender == shieldAgent, "ShieldVault: caller is not the agent");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Deposit BNB into the vault.
     */
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "ShieldVault: zero deposit");
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Deposit ERC20 tokens into the vault.
     * @param token The address of the ERC20 token.
     * @param amount The amount of tokens to deposit.
     */
    function depositToken(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "ShieldVault: zero address");
        require(amount > 0, "ShieldVault: zero amount");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        tokenDeposits[msg.sender][token] += amount;

        emit TokenDeposited(msg.sender, token, amount);
    }

    /**
     * @notice Withdraw BNB from the vault.
     * @param amount The amount of BNB to withdraw in wei.
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "ShieldVault: zero amount");
        require(deposits[msg.sender] >= amount, "ShieldVault: insufficient balance");

        deposits[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ShieldVault: BNB transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Withdraw ERC20 tokens from the vault.
     * @param token The address of the ERC20 token.
     * @param amount The amount of tokens to withdraw.
     */
    function withdrawToken(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "ShieldVault: zero address");
        require(amount > 0, "ShieldVault: zero amount");
        require(
            tokenDeposits[msg.sender][token] >= amount,
            "ShieldVault: insufficient token balance"
        );

        tokenDeposits[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit TokenWithdrawn(msg.sender, token, amount);
    }

    /**
     * @notice Execute a protective swap on behalf of a user via PancakeSwap V3.
     * @dev Only callable by the authorized shield agent.
     * @param user The user whose deposited funds will be used.
     * @param tokenIn The token to swap from.
     * @param tokenOut The token to swap to.
     * @param amountIn The amount of tokenIn to swap.
     * @param router The PancakeSwap V3 SwapRouter address.
     */
    function executeProtection(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address router
    ) external onlyAgent nonReentrant {
        require(user != address(0), "ShieldVault: zero user address");
        require(router != address(0), "ShieldVault: zero router address");
        require(amountIn > 0, "ShieldVault: zero amount");
        require(
            tokenDeposits[user][tokenIn] >= amountIn,
            "ShieldVault: insufficient user token balance"
        );

        // Deduct from user's deposit balance
        tokenDeposits[user][tokenIn] -= amountIn;

        // Approve the router to spend tokenIn
        IERC20(tokenIn).safeIncreaseAllowance(router, amountIn);

        // Execute the swap via PancakeSwap V3 SwapRouter
        IPancakeV3SwapRouter.ExactInputSingleParams memory params = IPancakeV3SwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: DEFAULT_FEE,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0, // Agent handles slippage off-chain
                sqrtPriceLimitX96: 0
            });

        uint256 amountOut = IPancakeV3SwapRouter(router).exactInputSingle(params);

        // Credit the swapped tokens to the user
        tokenDeposits[user][tokenOut] += amountOut;

        emit ProtectionExecuted(user, tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @notice Set the authorized agent address.
     * @param _agent The new agent address.
     */
    function setAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "ShieldVault: zero agent address");
        address oldAgent = shieldAgent;
        shieldAgent = _agent;
        emit AgentUpdated(oldAgent, _agent);
    }

    /**
     * @notice Get a user's BNB deposit balance.
     * @param user The user address.
     * @return The BNB balance in wei.
     */
    function getDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }

    /**
     * @notice Get a user's ERC20 token deposit balance.
     * @param user The user address.
     * @param token The token address.
     * @return The token balance.
     */
    function getTokenDeposit(address user, address token) external view returns (uint256) {
        return tokenDeposits[user][token];
    }

    /// @notice Allow the contract to receive BNB directly.
    receive() external payable {
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
