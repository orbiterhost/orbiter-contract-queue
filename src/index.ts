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
						// Direct update if we have a site ID
						const { error } = await supabase
							.from("sites")
							.update({ site_contract: contractAddress })
							.eq("id", data.siteId);

						if (error) {
							console.error("Error updating site contract in database:", error);
							throw error;
						}
						console.log(`Updated site ${data.siteId} with contract ${contractAddress}`);
					} else if (data.domain) {
						// Store in KV for later use
						await env.SITE_CONTRACT.put(data.domain, contractAddress);

						// Ensure domain has the correct format for DB lookup
						const fullDomain = `${data.domain}.orbiter.website`;

						try {
							const { data: sites, error: lookupError } = await supabase
								.from("sites")
								.select("id")
								.eq("domain", fullDomain);

							if (lookupError) {
								console.error("Error looking up site by domain:", lookupError);
							} else if (sites && sites.length > 0) {
								const siteId = sites[0].id;
								const { error: updateError } = await supabase
									.from("sites")
									.update({ site_contract: contractAddress })
									.eq("id", siteId);

								if (updateError) {
									console.error("Error updating site contract in database:", updateError);
								} else {
									console.log(`Updated site ${siteId} with contract ${contractAddress}`);
								}
							} else {
								console.log(`No site found with domain: ${fullDomain}`);
								console.log(`UserId: ${data.userId}, OrgId: ${data.orgId}`);
							}
						} catch (error) {
							console.error("Error during site lookup and update:", error);
						}
					} else {
						console.error("Missing both siteId and domain for contract creation");
					}

					// If we also have a CID, queue an update operation
					if (data.cid) {
						await env.CONTRACT_QUEUE.send({
							type: 'update_contract',
							cid: data.cid,
							contractAddress: contractAddress,
							domain: data.domain,
							userId: data.userId,
							orgId: data.orgId,
							siteId: data.siteId
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
				message.ack(); // Acknowledge to avoid infinite loops
			}
		}
	},
} as ExportedHandler<Env>;
