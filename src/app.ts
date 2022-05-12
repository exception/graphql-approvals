import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import express from 'express';
import http from 'http';
import {schema} from './schema';
import { ethers } from 'ethers';
import { Provider } from 'ethers-multicall';

export const provider = new ethers.providers.CloudflareProvider();
export const multiCallProvider = new Provider(provider);

export async function startServer() {
    await multiCallProvider.init();

    const app = express();
    const httpServer = http.createServer(app);
    const server = new ApolloServer({
        schema: schema,
        csrfPrevention: true,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
    });

    await server.start();
    server.applyMiddleware({ app });
    if (process.env.NODE_ENV !== 'test') {
        httpServer.listen(4000, () => {
            console.log(`Running at http://localhost:4000${server.graphqlPath}`);
        });
    }
    return server;
}

startServer();