// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DiplomatAttestation} from "../src/DiplomatAttestation.sol";

contract DiplomatAttestationTest is Test {
    DiplomatAttestation public diplomat;
    address public owner = address(1);
    address public workflow = address(2);
    address public alice = address(3);
    address public bob = address(4);
    address public spammer = address(5);

    function setUp() public {
        vm.prank(owner);
        diplomat = new DiplomatAttestation(workflow);
    }

    function test_attest_basic() public {
        bytes32 emailHash = keccak256("email-001");

        vm.prank(workflow);
        diplomat.attest(
            emailHash,
            alice,        // sender
            bob,          // recipient
            3,            // attnStaked
            0,            // qafN (first email)
            7,            // llmScore
            "legit",      // llmCategory
            bytes32(0)    // x402PaymentHash
        );

        assertEq(diplomat.totalAttestations(), 1);

        (bool exists, address sender, address recipient, uint16 attn,
         uint8 qafN, uint8 score, string memory cat, uint256 ts) = diplomat.verify(emailHash);

        assertTrue(exists);
        assertEq(sender, alice);
        assertEq(recipient, bob);
        assertEq(attn, 3);
        assertEq(qafN, 0);
        assertEq(score, 7);
        assertEq(cat, "legit");
        assertGt(ts, 0);
    }

    function test_attest_spam_high_qaf() public {
        bytes32 emailHash = keccak256("spam-004");

        vm.prank(workflow);
        diplomat.attest(
            emailHash,
            spammer,
            bob,
            48,           // attnStaked: QAF n=3 (16) × spam (3) = 48
            3,            // qafN = 3 unread streak
            2,            // llmScore (low quality)
            "spam",
            keccak256("x402-tx-hash")
        );

        (bool exists,,,uint16 attn, uint8 qafN, uint8 score, string memory cat,) = diplomat.verify(emailHash);
        assertTrue(exists);
        assertEq(attn, 48);
        assertEq(qafN, 3);
        assertEq(score, 2);
        assertEq(cat, "spam");
    }

    function test_revert_duplicate() public {
        bytes32 emailHash = keccak256("dup");

        vm.prank(workflow);
        diplomat.attest(emailHash, alice, bob, 3, 0, 5, "cold", bytes32(0));

        vm.prank(workflow);
        vm.expectRevert("Already attested");
        diplomat.attest(emailHash, alice, bob, 3, 0, 5, "cold", bytes32(0));
    }

    function test_revert_unauthorized() public {
        bytes32 emailHash = keccak256("unauth");

        vm.prank(alice); // not workflow or owner
        vm.expectRevert("Not authorized");
        diplomat.attest(emailHash, alice, bob, 3, 0, 5, "cold", bytes32(0));
    }

    function test_revert_invalid_score() public {
        vm.prank(workflow);
        vm.expectRevert("Score must be 0-10");
        diplomat.attest(keccak256("bad"), alice, bob, 3, 0, 11, "spam", bytes32(0));
    }

    function test_owner_can_attest() public {
        vm.prank(owner);
        diplomat.attest(keccak256("owner"), alice, bob, 3, 0, 5, "cold", bytes32(0));
        assertEq(diplomat.totalAttestations(), 1);
    }

    function test_set_workflow() public {
        address newWorkflow = address(99);
        vm.prank(owner);
        diplomat.setWorkflow(newWorkflow);
        assertEq(diplomat.workflow(), newWorkflow);
    }

    function test_verify_nonexistent() public view {
        (bool exists,,,,,,, ) = diplomat.verify(keccak256("nope"));
        assertFalse(exists);
    }
}
