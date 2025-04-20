import {
	createWalletClient,
	http,
	createPublicClient,
	decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { orbiterFactory, orbiterContract } from "./contracts";
import { ENV } from "./types";

type EventLogs = {
	eventName: string;
	args: {
		cloneAddress: string;
	};
};

const publicClient = createPublicClient({
	chain: base,
	transport: http(),
});

export async function createContract(
	c: ENV,
): Promise<EventLogs | undefined> {
	const account = privateKeyToAccount(c.ORBITER_PRIVATE_KEY as "0x");

	const walletClient = createWalletClient({
		chain: base,
		transport: http(c.BASE_ALCHEMY_URL),
		account: account,
	});
	try {
		const { request } = await publicClient.simulateContract({
			account,
			address: c.CONTRACT_ADDRESS as "0x",
			abi: orbiterFactory.abi,
			functionName: "createOrbiterSite",
		});
		const tx = await walletClient.writeContract(request);
		const receipt = await publicClient.waitForTransactionReceipt({
			hash: tx,
		});
		if (receipt.status !== "success") {
			throw Error("TX not confirmed");
		}

		const logs = decodeEventLog({
			abi: orbiterFactory.abi,
			data: receipt.logs[1].data,
			topics: receipt.logs[1].topics,
		});

		return logs as unknown as EventLogs;
	} catch (error) {
		console.log(error);
		return undefined;
	}
}

export async function writeCID(
	c: ENV,
	cid: string,
	contractAddress: `0x${string}`,
): Promise<string | unknown> {
	try {
		const account = privateKeyToAccount(c.ORBITER_PRIVATE_KEY as "0x");
		const walletClient = createWalletClient({
			chain: base,
			transport: http(),
			account: account,
		});
		const { request } = await publicClient.simulateContract({
			account,
			address: contractAddress,
			abi: orbiterContract.abi,
			functionName: "updateMapping",
			args: [cid],
		});
		const tx = await walletClient.writeContract(request);
		const receipt = await publicClient.waitForTransactionReceipt({
			hash: tx,
		});
		if (receipt.status !== "success") {
			throw Error("TX not confirmed");
		}
		return receipt.status;
	} catch (error) {
		console.log(error);
		return error;
	}
}
