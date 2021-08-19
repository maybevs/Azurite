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
      assert.strictEqual(err.response.status, 202);
      assert.strictEqual(err.statusCode, 404);
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

  it("All entities and operations in a batch must be different, @loki", async () => {
    const partitionKey1 = createUniquePartitionKey();
    // const partitionKey2 = createUniquePartitionKey();
    const tableName: string = getUniqueName("datatables");

    const entity = createBasicEntityForTest(partitionKey1);
    const sameEntitiesClient = createDataTablesTableTestClient(tableName);

    await sameEntitiesClient.create();
    const batch = sameEntitiesClient.createBatch(partitionKey1);
    batch.createEntity(entity);
    batch.updateEntity(entity, "Replace");
    batch.updateEntity(entity, "Replace");
    batch.updateEntity(entity, "Replace");
    batch.updateEntity(entity, "Replace");

    // SDK Prevents this?

    await batch
      .submitBatch()
      .then((response) => {
        assert.fail("we should not succeed!");
      })
      .catch((err) => {
        if (err.message === "we should not succeed!") {
          assert.notStrictEqual(
            err.message,
            "we should not succeed!",
            "We should not be able to modify the same entity multiple times"
          );
        } else {
          assert.strictEqual(err.statusCode, 400);
          assert.strictEqual(err.code, "InvalidDuplicateRow");
          // ToDo: service now responds with InvalidDuplicateRow not sure if we can match this we respond with InvalidInput
          // "1:The batch request contains multiple changes with same row key.
          // An entity can appear only once in a batch request.\nRequestId:146d91de-1002-0064-74d7-94543d000000\nTime:2021-08-19T08:54:15.9635302Z"
          // now we need to ensure that the entity in the batch was not actually created
          sameEntitiesClient
            .getEntity(entity.partitionKey, entity.rowKey)
            .then()
            .catch((errGet) => {
              assert.strictEqual(
                errGet.statusCode,
                404,
                "Entity should not have been created."
              );
            });
        }
      })
      .finally();
  });
});
