// Tests in this file are using @azure/data-tables

import * as assert from "assert";
import { TableClient } from "@azure/data-tables";
import { configLogger } from "../../../src/common/Logger";
import TableServer from "../../../src/table/TableServer";
import { getUniqueName } from "../../testutils";
import {
  AzureDataTablesTestEntity,
  createBasicEntityForTest
} from "./AzureDataTablesTestEntity";
import {
  createConnectionStringForDataTablesTest,
  createSharedKeyCredentialForDataTablesTest,
  createTableServerForTestHttps,
  createUniquePartitionKey
} from "./table.entity.test.utils";

// Set true to enable debug log
configLogger(false);
// For convenience, we have a switch to control the use
// of a local Azurite instance, otherwise we need an
// ENV VAR called AZURE_TABLE_STORAGE added to mocha
// script or launch.json containing
// Azure Storage Connection String (using SAS or Key).
const testLocalAzuriteInstance = true;

function createDataTablesTableTestClient(tableName: string): TableClient {
  const tableClient = new TableClient(
    createConnectionStringForDataTablesTest(testLocalAzuriteInstance),
    tableName,
    createSharedKeyCredentialForDataTablesTest(testLocalAzuriteInstance)
  );
  return tableClient;
}

describe("table Entity APIs test", () => {
  let server: TableServer;

  const requestOverride = { headers: {} };

  before(async () => {
    server = createTableServerForTestHttps();
    await server.start();
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
  });

  after(async () => {
    await server.close();
  });

  it("Batch API should serialize errors according to group transaction spec, @loki", async () => {
    const partitionKey = createUniquePartitionKey();
    const testEntities: AzureDataTablesTestEntity[] = [
      createBasicEntityForTest(partitionKey),
      createBasicEntityForTest(partitionKey),
      createBasicEntityForTest(partitionKey)
    ];

    const badTableClient = createDataTablesTableTestClient(
      getUniqueName("tabledoesnotexist")
    );

    // await badTableClient.create(); // deliberately do not create table
    const batch = badTableClient.createBatch(partitionKey);
    batch.createEntities(testEntities);

    try {
      await batch.submitBatch();
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.code, "TableNotFound");
    }
  });

  it("Batch API should reject request with more than 100 transactions, @loki", async () => {
    const partitionKey = createUniquePartitionKey();
    const tableName: string = getUniqueName("datatables");
    const testEntities: AzureDataTablesTestEntity[] = [];
    const TOO_MANY_REQUESTS = 101;
    while (testEntities.length < TOO_MANY_REQUESTS) {
      testEntities.push(createBasicEntityForTest(partitionKey));
    }

    const tooManyRequestsClient = createDataTablesTableTestClient(tableName);

    await tooManyRequestsClient.create();
    const batch = tooManyRequestsClient.createBatch(partitionKey);
    batch.createEntities(testEntities);

    try {
      await batch.submitBatch();
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.code, "InvalidInput");
    }
  });

  it("All entities in a batch must have the same partition key, @loki", (done) => {
    // const partitionKey1 = createUniquePartitionKey();
    // const partitionKey2 = createUniquePartitionKey();
    // const tableName: string = getUniqueName("datatables");
    // const testEntities: AzureDataTablesTestEntity[] = [];

    // testEntities.push(createBasicEntityForTest(partitionKey1));
    // testEntities.push(createBasicEntityForTest(partitionKey2));

    // const twoPartitionKeysClient = createDataTablesTableTestClient(tableName);

    // await twoPartitionKeysClient.create();
    // const batch = twoPartitionKeysClient.createBatch(partitionKey1);
    // batch.createEntities(testEntities);
    // // SDK Prevents this.
    // try {
    //   await batch.submitBatch();
    // } catch (err) {
    //   assert.strictEqual(err.statusCode, 400);
    //   assert.strictEqual(err.code, "InvalidInput");
    // }
    done();
  });
});
