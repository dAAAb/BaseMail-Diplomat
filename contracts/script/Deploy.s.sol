// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DiplomatAttestation} from "../src/DiplomatAttestation.sol";

/**
 * Deploy + Verify:
 *
 * source .env
 * forge script script/Deploy.s.sol --rpc-url $RPC_URL_BASE_SEPOLIA --broadcast --verify \
 *   --etherscan-api-key $BASESCAN_API_KEY
 *
 * ⚠️ PRIVATE_KEY is read from env var — NEVER hardcode it.
 */
contract DeployDiplomat is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address workflow = vm.envAddress("WORKFLOW_ADDRESS");

        vm.startBroadcast(deployerKey);
        DiplomatAttestation diplomat = new DiplomatAttestation(workflow);
        vm.stopBroadcast();

        console.log("DiplomatAttestation deployed at:", address(diplomat));
        console.log("Workflow address:", workflow);
        console.log("Owner:", vm.addr(deployerKey));
    }
}
