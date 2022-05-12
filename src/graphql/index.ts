import { Contract } from 'ethers-multicall';
import { nonNull, objectType, stringArg } from 'nexus';
import { multiCallProvider, provider } from '../app';
import { erc721abi, ERC721_ID } from '../constants';

const hasApprovedArgs = {
    address: nonNull(
        stringArg({
            description: 'ENS / EOA address',
        }),
    ),
    collection: nonNull(
        stringArg({
            description: 'ERC721 address',
        }),
    ),
};

type AddressData = {
    isEns: boolean;
    value: string;
};

const sanitizeAndValidateAddress = (address: string): AddressData => {
    const regex = new RegExp(/^0x[a-fA-F0-9]{40}$/);
    let sanitized = address.replace(/[^a-z0-9áéíóúñü .,_-]/gim, '').trim();
    let isEns = false;
    if (sanitized.toLowerCase().endsWith('.eth')) {
        // we can check vs lowercase as ENS records are case insensitive
        isEns = true;
    } else {
        if (!sanitized.startsWith('0x')) {
            sanitized = '0x'.concat(sanitized);
        }

        if (!regex.test(sanitized)) {
            throw new Error(
                'Provided address was EOA but failed to match RegEx',
            );
        }
    }

    return { isEns, value: sanitized };
};

const getAddressFromEns = async (address: string): Promise<string> => {
    const resolver = await provider.getResolver(address);
    if (!resolver) {
        throw new Error(`${address} is not a registered ENS domain`);
    }
    const resolved = await resolver.getAddress();
    return resolved;
};

export const hasApproved = objectType({
    name: 'Query',
    definition(t) {
        t.field('hasApproved', {
            type: 'Boolean',
            args: hasApprovedArgs,
            resolve: async (_, { address, collection }) => {
                const { isEns: addressEns, value: realAddress } =
                    sanitizeAndValidateAddress(address);
                const { isEns: collectionEns, value: collectionAddress } =
                    sanitizeAndValidateAddress(collection);
                const addressToCheck = addressEns
                    ? await getAddressFromEns(realAddress)
                    : realAddress;
                const collectionToCheck = collectionEns
                    ? await getAddressFromEns(collectionAddress)
                    : collectionAddress;

                const collectionContract = new Contract(
                    collectionToCheck,
                    erc721abi,
                );
                const supporstsInterfacePromise =
                    collectionContract.supportsInterface(ERC721_ID);
                const hasApprovedPromise = collectionContract.isApprovedForAll(
                    addressToCheck,
                    '0xf42aa99F011A1fA7CDA90E5E98b277E306BcA83e', // LooksRare TransferManagerERC721 address on mainnet
                );

                try {
                    // supportsInterface will revert if the contract does not support the function, so
                    // we deal with that error in the catch clause.
                    const [isErc721, hasApproved] = await multiCallProvider.all(
                        [supporstsInterfacePromise, hasApprovedPromise],
                    );
                    if (!isErc721) {
                        throw new Error(
                            'Tried to check approval against a non-ERC721 collection',
                        );
                    }

                    return hasApproved;
                } catch (err) {
                    throw new Error("Check failed, most likely this means you did not provide an ERC721 compatible address!");
                }
            },
        });
    },
});
