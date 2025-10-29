# 加载 .env 文件（如果存在）
-include .env
export

.PHONY: deploy deploy-testnet verify-invoice-token verify-pool verify test build clean wallet-list

wallet-list:
	@cast wallet list

deploy-testnet:
	forge script script/Deploy.s.sol:DeployScript \
		--rpc-url zircuit_testnet \
		--account testnetKey \
		--sender $$(cast wallet address --account testnetKey) \
		--broadcast \
		--legacy \
		--verify \
		-vvvv

build:
	forge build

test:
	forge test -vvv

clean:
	forge clean