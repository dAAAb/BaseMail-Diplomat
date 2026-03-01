// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {DiplomatAttestation} from "../src/DiplomatAttestation.sol";

contract DeployDiplomat is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address workflow = vm.envAddress("WORKFLOW_ADDRESS");

        vm.startBroadcast(deployerKey);
        DiplomatAttestation diplomat = new DiplomatAttestation(workflow);
        vm.stopBroadcast();

        // solhint-disable-next-line no-console
        // Log deployment info
    }
}
