// Tests in this file are using @azure/data-tables
// aim is to validate serial and batch transactions performance
// db settings are modified as per the following lokijs article
// https://github.com/techfort/LokiJS/wiki/LokiJS-persistence-and-adapters

import * as assert from "assert";
import { TableClient, TableTransaction } from "@azure/data-tables";
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
import * as fs from "fs";
// Set true to enable debug log
configLogger(false);
// delete files from previous test runs...
const cleanup = true;
// For convenience, we have a switch to control the use
// of a local Azurite instance, otherwise we need an
// ENV VAR called AZURE_TABLE_STORAGE added to mocha
// script or launch.json containing
// Azure Storage Connection String (using SAS or Key).
const testLocalAzuriteInstance = true;

// cleanup / delete old lokijs db files
if (cleanup) {
  removeDBFiles();
}

describe("table API Perf tests", () => {
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

  // with current version performance is linear O(n)
  it("Should create 100 Entities, serial, @loki", async () => {
    const tableName: string = getUniqueName(
      `serialPerf${new Date().getTime().toString()}`
    );
    let serialPerfClient: TableClient | undefined = createAzureDataTablesClient(
      testLocalAzuriteInstance,
      tableName
    );
    await serialPerfClient.createTable();

    const testRequestIterations = 100;

    await serialPerformanceTest(
      testRequestIterations,
      serialPerfClient,
      partitionKey
    );

    serialPerfClient = undefined;
  });

  // it("Should create 5000 Entities, serial, @loki", async () => {
  //   const tableName: string = getUniqueName(
  //     `serialPerf${new Date().getTime().toString()}`
  //   );
  //   const serialPerfClient = createAzureDataTablesClient(
  //     testLocalAzuriteInstance,
  //     tableName
  //   );
  //   await serialPerfClient.createTable();

  //   const testRequestIterations = 5000;
  //   await serialPerformanceTest(
  //     testRequestIterations,
  //     serialPerfClient,
  //     partitionKey
  //   );
  // });

  // it("Should create 7000 Entities, serial, @loki", async () => {
  //   const tableName: string = getUniqueName(
  //     `serialPerf${new Date().getTime().toString()}`
  //   );
  //   const serialPerfClient = createAzureDataTablesClient(
  //     testLocalAzuriteInstance,
  //     tableName
  //   );
  //   await serialPerfClient.createTable();

  //   const testRequestIterations = 7000;
  //   await serialPerformanceTest(
  //     testRequestIterations,
  //     serialPerfClient,
  //     partitionKey
  //   );
  // });

  it("Should create 1000 Entities, Batch, @loki", async () => {
    const tableName: string = getUniqueName("b1000");
    const batchClient = createAzureDataTablesClient(
      testLocalAzuriteInstance,
      tableName
    );
    await batchClient.createTable();

    // Stage 1 : create a large table...
    const numberOfEntitiesInTable = 1000;
    await prepareTableForTests(
      partitionKey,
      batchClient,
      numberOfEntitiesInTable
    );

    // Stage 2 : Test insertions into table
    await stage2TestsOnTable(partitionKey, batchClient, 10, 10);
  });

  it("Should create 2000 Entities, Batch, @loki", async () => {
    const tableName: string = getUniqueName("batchPerf");
    const batchClient = createAzureDataTablesClient(
      testLocalAzuriteInstance,
      tableName
    );
    await batchClient.createTable();

    // Stage 1 : create a large table...
    const numberOfEntitiesInTable = 2000;
    await prepareTableForTests(
      partitionKey,
      batchClient,
      numberOfEntitiesInTable
    );

    // Stage 2 : Test insertions into table
    await stage2TestsOnTable(partitionKey, batchClient, 10, 10);
  });

  it("Should create 20000 Entities, Batch, @loki", async () => {
    const tableName: string = getUniqueName("batchPerf");
    const batchClient = createAzureDataTablesClient(
      testLocalAzuriteInstance,
      tableName
    );
    await batchClient.createTable();

    // Stage 1 : create a large table...
    const numberOfEntitiesInTable = 20000;
    await prepareTableForTests(
      partitionKey,
      batchClient,
      numberOfEntitiesInTable
    );

    // Stage 2 : Test insertions into table
    await stage2TestsOnTable(partitionKey, batchClient, 10, 10);
  });
});

function removeDBFiles() {
  const files = fs
    .readdirSync(process.cwd())
    .filter((fn) => fn.startsWith("__tableTestsStorage__"));
  files.forEach((fileName) => {
    if (fs.existsSync(fileName)) {
      fs.unlink(fileName, (err) => {
        if (err) {
          // tslint:disable-next-line: no-console
          console.log(`${fileName} not deleted, maybe not there`);
        } else {
          // tslint:disable-next-line: no-console
          console.log(`${fileName} DB file is deleted.`);
        }
      });
    }
  });
}

async function serialPerformanceTest(
  testRequestIterations: number,
  serialPerfClient: TableClient,
  partitionKey: string
) {
  for (let i = 0; i < testRequestIterations; i++) {
    try {
      await serialPerfClient.createEntity(
        createBasicEntityForTest(partitionKey)
      );
    } catch (err: unknown) {
      const restError = err as RestError;
      assert.strictEqual(
        restError,
        null,
        `We had an error on entity: ${restError.message}`
      );
    }
  }
}

async function prepareTableForTests(
  partitionKey: string,
  batchClient: TableClient,
  numberOfEntitiesInTable: number
) {
  const batchSize = 100; // fastest tests using fewest ops
  const iterations = numberOfEntitiesInTable / batchSize;
  for (let i = 0; i < iterations; i++) {
    const testEntities: AzureDataTablesTestEntity[] = [];
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
}

async function stage2TestsOnTable(
  partitionKey: string,
  batchClient: TableClient,
  batchSize: number,
  iterations: number
) {
  for (let i = 0; i < iterations; i++) {
    const testEntities2: AzureDataTablesTestEntity[] = [];
    while (testEntities2.length < batchSize) {
      testEntities2.push(createBasicEntityForTest(partitionKey));
    }

    const transaction2 = new TableTransaction();
    for (const testEntity2 of testEntities2) {
      transaction2.createEntity(testEntity2);
    }

    try {
      await batchClient.submitTransaction(transaction2.actions);
    } catch (err2: unknown) {
      const restError2 = err2 as RestError;
      assert.strictEqual(
        restError2,
        null,
        `We had an error on stage 2: ${restError2.message}`
      );
    }
  }
}
