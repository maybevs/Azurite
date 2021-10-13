// Tests in this file are using @azure/data-tables

import * as assert from "assert";
import { TableTransaction } from "@azure/data-tables";
import { configLogger } from "../../../src/common/Logger";
import TableServer from "../../../src/table/TableServer";
import { getUniqueName } from "../../testutils";
import {
  AzureDataTablesTestEntity,
  createBasicEntityForTest
} from "./AzureDataTablesTestEntity";
import {
  createAzureDataTablesClient,
  createTableServerForTestHttps,
  createUniquePartitionKey
} from "./table.entity.test.utils";
import { RestError } from "@azure/ms-rest-js";

// Set true to enable debug log
configLogger(false);
// For convenience, we have a switch to control the use
// of a local Azurite instance, otherwise we need an
// ENV VAR called AZURE_TABLE_STORAGE added to mocha
// script or launch.json containing
// Azure Storage Connection String (using SAS or Key).
const testLocalAzuriteInstance = true;

describe("table Entity Batch API Perf tests", () => {
  let server: TableServer;
  const partitionKey = createUniquePartitionKey("batchPerf");
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

  it("Should create 1000 Entities, @loki", async () => {
    const tableName: string = getUniqueName(
      `batchPerf${new Date().getTime().toString()}`
    );
    const batchClient = createAzureDataTablesClient(
      testLocalAzuriteInstance,
      tableName
    );
    await batchClient.createTable();

    // Stage 1 : create a large table...
    // with current version performance is linear O(n)
    // based on number of entities / transactions in test
    for (let i = 0; i < 80; i++) {
      const testEntities: AzureDataTablesTestEntity[] = [];
      const batchSize = 100;
      while (testEntities.length < batchSize) {
        testEntities.push(createBasicEntityForTest(partitionKey));
      }

      const transaction = new TableTransaction();
      for (const testEntity of testEntities) {
        transaction.createEntity(testEntity);
      }

      try {
        await batchClient.submitTransaction(transaction.actions);
      } catch (err: unknown) {
        const restError = err as RestError;
        assert.strictEqual(
          restError,
          null,
          `We had an error on entity: ${restError.message}`
        );
      }
    }

    // Stage 2 : Test insertions into large table / partition...
    // Small batch vs. large batch?
  });
});
