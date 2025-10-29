// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/InvoiceToken.sol";
import "../src/Pool.sol";

contract DeployScript is Script {
    function run() external {
        address deployer = msg.sender;
        
        console.log("Deploying contracts with address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast();

        // 從環境變數讀取配置
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);
        address minter = vm.envOr("RELAYER_ADDRESS", deployer);
        address oracle = vm.envOr("ORACLE_ADDRESS", deployer);

        console.log("Admin address:", admin);
        console.log("Minter address:", minter);
        console.log("Oracle address:", oracle);

        // 部署 InvoiceToken
        InvoiceToken invoiceToken = new InvoiceToken(
            admin,
            minter,
            oracle,
            "https://api.invoice-rwa.com/metadata/{id}.json"
        );

        console.log("InvoiceToken deployed at:", address(invoiceToken));

        // 部署 Pool
        Pool pool = new Pool(
            admin,
            oracle,
            minter,  // claimOperator
            address(invoiceToken)
        );

        console.log("Pool deployed at:", address(pool));

        // 註冊初始 Pools
        // 注意：只有 admin 可以執行，所以只在 deployer == admin 時執行
        if (deployer == admin) {
            console.log("Registering pools...");
            
            pool.registerPool(
                1,
                admin,  // 暫時使用 admin，之後再改
                "Red Cross",
                4
            );

            pool.registerPool(
                2,
                admin,
                "Taiwan Fund for Children and Families",
                2
            );

            console.log("Pools registered");
        } else {
            console.log("Skipping pool registration (deployer is not admin)");
        }

        vm.stopBroadcast();

        // 輸出部署資訊
        console.log("\n=== Deployment Summary ===");
        console.log("InvoiceToken:", address(invoiceToken));
        console.log("Pool:", address(pool));
        console.log("Admin:", admin);
        console.log("Minter:", minter);
        console.log("Oracle:", oracle);
        console.log("\nAdd these to your .env:");
        console.log("INVOICE_TOKEN_ADDRESS=%s", address(invoiceToken));
        console.log("POOL_ADDRESS=%s", address(pool));
    }
}