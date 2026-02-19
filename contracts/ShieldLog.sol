// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ShieldLog
 * @notice Logs every protective action the ShieldFi AI agent takes.
 * @dev Immutable audit trail of all risk mitigation events across DeFi positions.
 */
contract ShieldLog {
    enum ActionType {
        VENUS_REPAY,
        LP_WITHDRAW,
        EMERGENCY_EXIT,
        REBALANCE,
        ALERT_ONLY
    }

    struct ShieldAction {
        address user;
        ActionType actionType;
        uint256 riskScoreBefore;
        uint256 riskScoreAfter;
        uint256 amountProtected; // in wei
        bytes32 reasoningHash; // keccak256 of AI reasoning text
        address tokenInvolved;
        uint256 timestamp;
    }

    ShieldAction[] public actions;
    mapping(address => uint256[]) public userActions;
    mapping(address => uint256) public totalProtected;
    mapping(address => uint256) public actionsCount;

    event ShieldActivated(
        address indexed user,
        ActionType actionType,
        uint256 riskScoreBefore,
        uint256 riskScoreAfter,
        uint256 amountProtected,
        uint256 timestamp
    );

    /**
     * @notice Log a protective action taken by the AI agent.
     * @param actionType The type of protective action performed.
     * @param riskScoreBefore Risk score before the action (0-10000 basis points).
     * @param riskScoreAfter Risk score after the action (0-10000 basis points).
     * @param amountProtected Amount of value protected in wei.
     * @param reasoningHash keccak256 hash of the AI agent's reasoning text.
     * @param tokenInvolved Address of the primary token involved in the action.
     */
    function logAction(
        ActionType actionType,
        uint256 riskScoreBefore,
        uint256 riskScoreAfter,
        uint256 amountProtected,
        bytes32 reasoningHash,
        address tokenInvolved
    ) external {
        uint256 actionId = actions.length;

        ShieldAction memory newAction = ShieldAction({
            user: msg.sender,
            actionType: actionType,
            riskScoreBefore: riskScoreBefore,
            riskScoreAfter: riskScoreAfter,
            amountProtected: amountProtected,
            reasoningHash: reasoningHash,
            tokenInvolved: tokenInvolved,
            timestamp: block.timestamp
        });

        actions.push(newAction);
        userActions[msg.sender].push(actionId);
        totalProtected[msg.sender] += amountProtected;
        actionsCount[msg.sender] += 1;

        emit ShieldActivated(
            msg.sender,
            actionType,
            riskScoreBefore,
            riskScoreAfter,
            amountProtected,
            block.timestamp
        );
    }

    /**
     * @notice Get all actions performed for a specific user.
     * @param user The address of the user.
     * @return An array of ShieldAction structs for the user.
     */
    function getUserActions(address user) external view returns (ShieldAction[] memory) {
        uint256[] memory actionIds = userActions[user];
        ShieldAction[] memory result = new ShieldAction[](actionIds.length);

        for (uint256 i = 0; i < actionIds.length; i++) {
            result[i] = actions[actionIds[i]];
        }

        return result;
    }

    /**
     * @notice Get aggregated stats for a user.
     * @param user The address of the user.
     * @return actionCount Total number of actions for the user.
     * @return totalAmountProtected Total value protected across all actions.
     * @return avgRiskReduction Average risk reduction per action (basis points).
     */
    function getUserStats(address user)
        external
        view
        returns (
            uint256 actionCount,
            uint256 totalAmountProtected,
            uint256 avgRiskReduction
        )
    {
        actionCount = actionsCount[user];
        totalAmountProtected = totalProtected[user];

        if (actionCount > 0) {
            uint256 totalReduction = 0;
            uint256[] memory actionIds = userActions[user];
            for (uint256 i = 0; i < actionIds.length; i++) {
                ShieldAction memory a = actions[actionIds[i]];
                if (a.riskScoreBefore > a.riskScoreAfter) {
                    totalReduction += (a.riskScoreBefore - a.riskScoreAfter);
                }
            }
            avgRiskReduction = totalReduction / actionCount;
        }
    }

    /**
     * @notice Get the most recent actions.
     * @param count Number of recent actions to retrieve.
     * @return An array of the most recent ShieldAction structs.
     */
    function getRecentActions(uint256 count) external view returns (ShieldAction[] memory) {
        uint256 totalActions = actions.length;
        if (count > totalActions) {
            count = totalActions;
        }

        ShieldAction[] memory result = new ShieldAction[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = actions[totalActions - count + i];
        }

        return result;
    }

    /**
     * @notice Get total number of logged actions.
     * @return Total actions count.
     */
    function getTotalActionsCount() external view returns (uint256) {
        return actions.length;
    }
}
