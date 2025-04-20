import { createContract, writeCID } from "./utils/viem";
import { createClient } from "@supabase/supabase-js";

interface ContractMessage {
	type: string;
	cid?: string;
	contractAddress?: `0x${string}`;
	siteId?: string;
	domain?: string;
	userId?: string;
	orgId?: string;
}

export default {
	async queue(batch: MessageBatch<ContractMessage>, env: Env): Promise<void> {
		for (let message of batch.messages) {
			try {
				const supabase = createClient(
					env.SUPABASE_URL,
					env.SUPABASE_SERVICE_ROLE_KEY
				);

				const data = message.body;
				console.log(`Processing queue message: ${data.type}`);

				if (data.type === 'create_contract') {
					// Create the contract
					const contractRes = await createContract(env);

					if (!contractRes) {
						throw Error("Problem creating contract");
					}

					const contractAddress = contractRes.args.cloneAddress as `0x${string}`;
					console.log(`Contract created: ${contractAddress}`);

					// Update the database with the contract address
					if (data.siteId) {
						const { error } = await supabase
							.from("sites")
							.update({ site_contract: contractAddress })
							.eq("id", data.siteId);

						if (error) {
							console.error("Error updating site contract in database:", error);
							throw error;
						}
					} else if (data.domain) {
						// Store in KV for later use
						await env.SITE_CONTRACT.put(data.domain, contractAddress);
					}

					// If we also have a CID, we need to immediately queue an update operation
					if (data.cid) {
						// Queue contract update operation
						await env.CONTRACT_QUEUE.send({
							type: 'update_contract',
							cid: data.cid,
							contractAddress: contractAddress,
							siteId: data.siteId,
							domain: data.domain,
							userId: data.userId,
							orgId: data.orgId
						});
					}
				}

				if (data.type === 'update_contract') {
					// Update the contract with the CID
					if (!data.contractAddress || !data.cid) {
						throw Error("Missing required parameters for update_contract");
					}

					console.log(`Updating contract ${data.contractAddress} with CID: ${data.cid}`);
					const result = await writeCID(env, data.cid, data.contractAddress);

					if (result !== "success") {
						throw Error(`Failed to update contract: ${result}`);
					}

					console.log("Contract updated successfully");
				}

				// Mark the message as successfully processed
				message.ack();
			} catch (error) {
				console.error("Error processing queue message:", error);

				// For now, we'll acknowledge failed messages to avoid infinite loops
				// In a production environment, you might want to implement retry logic
				// or dead-letter queues for failed messages
				message.ack();
			}
		}
	},
} as ExportedHandler<Env>;
