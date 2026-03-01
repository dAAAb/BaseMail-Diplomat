// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DiplomatAttestation
 * @notice On-chain attestation for BaseMail Diplomat email arbitration.
 *         Records every email decision: QAF pricing, LLM classification, ATTN staked.
 *         Triggered by Chainlink CRE workflow via Forwarder contract.
 *
 * @dev Academic basis: Quadratic Voting (Lalley & Weyl, 2015)
 *      CO-QAF (Ko, Tang, Weyl — EAAMO '25)
 */
contract DiplomatAttestation {
    // ── Events ──
    event EmailAttested(
        bytes32 indexed emailHash,
        address indexed sender,
        address indexed recipient,
        uint16 attnStaked,
        uint8 qafN,
        uint8 llmScore,
        string llmCategory,
        uint256 timestamp
    );

    event WorkflowUpdated(address indexed oldWorkflow, address indexed newWorkflow);

    // ── Storage ──
    struct Attestation {
        address sender;
        address recipient;
        uint16 attnStaked;
        uint8 qafN;           // unread streak count
        uint8 llmScore;       // 0-10
        string llmCategory;   // spam/cold/legit/high_value/reply
        bytes32 x402PaymentHash;
        uint256 timestamp;
    }

    mapping(bytes32 => Attestation) public attestations;
    uint256 public totalAttestations;
    
    address public owner;
    address public workflow;  // CRE Forwarder or authorized workflow address

    // ── Modifiers ──
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyWorkflow() {
        require(msg.sender == workflow || msg.sender == owner, "Not authorized");
        _;
    }

    // ── Constructor ──
    constructor(address _workflow) {
        owner = msg.sender;
        workflow = _workflow;
    }

    // ── Core ──

    /**
     * @notice Record an email attestation from the Diplomat CRE workflow.
     * @param emailHash Unique hash of the email (e.g. keccak256 of email_id)
     * @param sender Wallet address of email sender
     * @param recipient Wallet address of email recipient
     * @param attnStaked Amount of ATTN tokens staked
     * @param qafN Unread streak count (for QAF n² pricing)
     * @param llmScore LLM quality score (0-10)
     * @param llmCategory LLM classification (spam/cold/legit/high_value/reply)
     * @param x402PaymentHash Hash of x402 USDC payment transaction
     */
    function attest(
        bytes32 emailHash,
        address sender,
        address recipient,
        uint16 attnStaked,
        uint8 qafN,
        uint8 llmScore,
        string calldata llmCategory,
        bytes32 x402PaymentHash
    ) external onlyWorkflow {
        require(attestations[emailHash].timestamp == 0, "Already attested");
        require(llmScore <= 10, "Score must be 0-10");

        attestations[emailHash] = Attestation({
            sender: sender,
            recipient: recipient,
            attnStaked: attnStaked,
            qafN: qafN,
            llmScore: llmScore,
            llmCategory: llmCategory,
            x402PaymentHash: x402PaymentHash,
            timestamp: block.timestamp
        });

        totalAttestations++;

        emit EmailAttested(
            emailHash,
            sender,
            recipient,
            attnStaked,
            qafN,
            llmScore,
            llmCategory,
            block.timestamp
        );
    }

    /**
     * @notice Verify an attestation exists for a given email hash.
     */
    function verify(bytes32 emailHash) external view returns (
        bool exists,
        address sender,
        address recipient,
        uint16 attnStaked,
        uint8 qafN,
        uint8 llmScore,
        string memory llmCategory,
        uint256 timestamp
    ) {
        Attestation memory a = attestations[emailHash];
        return (
            a.timestamp > 0,
            a.sender,
            a.recipient,
            a.attnStaked,
            a.qafN,
            a.llmScore,
            a.llmCategory,
            a.timestamp
        );
    }

    // ── Admin ──

    function setWorkflow(address _workflow) external onlyOwner {
        emit WorkflowUpdated(workflow, _workflow);
        workflow = _workflow;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
