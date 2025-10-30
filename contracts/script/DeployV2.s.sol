// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PoolV2} from "../src/PoolV2.sol";
import {InvoiceTokenV2} from "../src/InvoiceTokenV2.sol";

contract DeployV2 is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address admin = vm.envAddress("ADMIN_ADDRESS");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address claimOperator = vm.envAddress("CLAIM_OPERATOR_ADDRESS");
        address minter = vm.envAddress("MINTER_ADDRESS");

        // 1. Deploy InvoiceTokenV2
        InvoiceTokenV2 invoiceToken = new InvoiceTokenV2(admin, minter, oracle, "https://api.example.com/v2/metadata/{id}.json");

        // 2. Deploy PoolV2
        PoolV2 pool = new PoolV2(admin, oracle, claimOperator, address(invoiceToken));

        // 3. Set pool contract address in InvoiceTokenV2
        invoiceToken.setPoolContract(address(pool));

        // 4. Register a pool in PoolV2
        pool.registerPool(1, 0x5aF25259EA825a88a9549883936243585A497172, "Genesis Charity V2", 2);

        vm.stopBroadcast();
    }
}