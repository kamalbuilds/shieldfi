// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ShieldRules
 * @notice Stores user-configured protection rules onchain for the ShieldFi AI agent.
 * @dev Users define risk thresholds and the agent monitors and triggers actions based on them.
 */
contract ShieldRules {
    enum RuleType {
        VENUS_HEALTH_FACTOR,
        IL_THRESHOLD,
        PORTFOLIO_DROP,
        CONCENTRATION_LIMIT,
        CUSTOM
    }

    struct Rule {
        address user;
        RuleType ruleType;
        uint256 threshold; // basis points or raw value depending on rule type
        bool autoExecute; // if true, agent acts without user confirmation
        bool active;
        string description;
        uint256 createdAt;
        uint256 lastTriggeredAt;
        uint256 triggerCount;
    }

    Rule[] public rules;
    mapping(address => uint256[]) public userRules;

    event RuleCreated(
        address indexed user,
        uint256 indexed ruleId,
        RuleType ruleType,
        uint256 threshold
    );

    event RuleToggled(uint256 indexed ruleId, bool active);

    event RuleTriggered(uint256 indexed ruleId, uint256 timestamp);

    modifier onlyRuleOwner(uint256 ruleId) {
        require(ruleId < rules.length, "ShieldRules: rule does not exist");
        require(rules[ruleId].user == msg.sender, "ShieldRules: not rule owner");
        _;
    }

    /**
     * @notice Create a new protection rule.
     * @param ruleType The type of risk rule.
     * @param threshold The threshold value (in basis points or raw value).
     * @param autoExecute Whether the agent can auto-execute without user confirmation.
     * @param description Human-readable description of the rule.
     * @return ruleId The ID of the newly created rule.
     */
    function createRule(
        RuleType ruleType,
        uint256 threshold,
        bool autoExecute,
        string calldata description
    ) external returns (uint256 ruleId) {
        ruleId = rules.length;

        rules.push(
            Rule({
                user: msg.sender,
                ruleType: ruleType,
                threshold: threshold,
                autoExecute: autoExecute,
                active: true,
                description: description,
                createdAt: block.timestamp,
                lastTriggeredAt: 0,
                triggerCount: 0
            })
        );

        userRules[msg.sender].push(ruleId);

        emit RuleCreated(msg.sender, ruleId, ruleType, threshold);
    }

    /**
     * @notice Toggle a rule between active and inactive.
     * @param ruleId The ID of the rule to toggle.
     */
    function toggleRule(uint256 ruleId) external onlyRuleOwner(ruleId) {
        rules[ruleId].active = !rules[ruleId].active;
        emit RuleToggled(ruleId, rules[ruleId].active);
    }

    /**
     * @notice Update the threshold of an existing rule.
     * @param ruleId The ID of the rule to update.
     * @param newThreshold The new threshold value.
     */
    function updateThreshold(uint256 ruleId, uint256 newThreshold) external onlyRuleOwner(ruleId) {
        rules[ruleId].threshold = newThreshold;
    }

    /**
     * @notice Soft-delete a rule by deactivating it.
     * @param ruleId The ID of the rule to delete.
     */
    function deleteRule(uint256 ruleId) external onlyRuleOwner(ruleId) {
        rules[ruleId].active = false;
        emit RuleToggled(ruleId, false);
    }

    /**
     * @notice Get all rules for a specific user.
     * @param user The address of the user.
     * @return An array of Rule structs belonging to the user.
     */
    function getUserRules(address user) external view returns (Rule[] memory) {
        uint256[] memory ruleIds = userRules[user];
        Rule[] memory result = new Rule[](ruleIds.length);

        for (uint256 i = 0; i < ruleIds.length; i++) {
            result[i] = rules[ruleIds[i]];
        }

        return result;
    }

    /**
     * @notice Get only active rules for a specific user.
     * @param user The address of the user.
     * @return An array of active Rule structs belonging to the user.
     */
    function getActiveRules(address user) external view returns (Rule[] memory) {
        uint256[] memory ruleIds = userRules[user];

        // First pass: count active rules
        uint256 activeCount = 0;
        for (uint256 i = 0; i < ruleIds.length; i++) {
            if (rules[ruleIds[i]].active) {
                activeCount++;
            }
        }

        // Second pass: populate results
        Rule[] memory result = new Rule[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < ruleIds.length; i++) {
            if (rules[ruleIds[i]].active) {
                result[idx] = rules[ruleIds[i]];
                idx++;
            }
        }

        return result;
    }

    /**
     * @notice Mark a rule as triggered. Called by the agent after executing a protection action.
     * @param ruleId The ID of the rule that was triggered.
     */
    function markTriggered(uint256 ruleId) external {
        require(ruleId < rules.length, "ShieldRules: rule does not exist");
        rules[ruleId].lastTriggeredAt = block.timestamp;
        rules[ruleId].triggerCount += 1;

        emit RuleTriggered(ruleId, block.timestamp);
    }

    /**
     * @notice Get the total number of rules created.
     * @return Total rules count.
     */
    function getTotalRulesCount() external view returns (uint256) {
        return rules.length;
    }
}
