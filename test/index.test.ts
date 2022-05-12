import { startServer } from '../src/app';

describe('GraphQL test', function () {
    let server;

    beforeAll(async function() {
        server = await startServer();
    })

    it("should try to resolve with a fake ens name", async function () {
        const result = await server.executeOperation({
            query: 'query Query($address: String!, $collection: String!) { hasApproved(address: $address, collection: $collection) }',
            variables: { address: 'erosembergfake.eth', collection: '0x23581767a106ae21c074b2276d25e5c3e136a68b' }
        });
        expect(result.errors).not.toBeUndefined();
    });

    it("should check a non ERC721 collection", async function () {
        const result = await server.executeOperation({
            query: 'query Query($address: String!, $collection: String!) { hasApproved(address: $address, collection: $collection) }',
            variables: { address: '0x54BE3a794282C030b15E43aE2bB182E14c409C5e', collection: '0x495f947276749ce646f68ac8c248420045cb7b5e' }
        });

        expect(result.errors).not.toBeUndefined();
    });

    it("should check a non approved collection", async function () {
        const result = await server.executeOperation({
            query: 'query Query($address: String!, $collection: String!) { hasApproved(address: $address, collection: $collection) }',
            variables: { address: '0x54BE3a794282C030b15E43aE2bB182E14c409C5e', collection: '0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258' }
        });

        expect(result.data.hasApproved).toBe(false);
    });

    it("should check an approved collection with ens", async function () {
        jest.setTimeout(10_000); // set timeout to be longer as this can take longer
        const result = await server.executeOperation({
            query: 'query Query($address: String!, $collection: String!) { hasApproved(address: $address, collection: $collection) }',
            variables: { address: 'dingaling.eth', collection: '0x23581767a106ae21c074b2276d25e5c3e136a68b' }
        });

        expect(result.data.hasApproved).toBe(true);
    });
});
