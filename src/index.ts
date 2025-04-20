export default {
	async queue(batch: MessageBatch<any>, env: {}): Promise<void> {
		for (let message of batch.messages) {
			const data = message.body as { type: string, cid: string, contractAddress?: `0x` }

			if (data.type === 'create_contract') {

			}

			if (data.type === 'update_contract') {

			}
		}
	},
} satisfies ExportedHandler<Env, Error>;
