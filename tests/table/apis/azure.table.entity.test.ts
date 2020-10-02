import * as assert from "assert";
import * as Azure from "azure-storage";

import { configLogger } from "../../../src/common/Logger";
import StorageError from "../../../src/table/errors/StorageError";
// import TableConfiguration from "../../../src/table/TableConfiguration";
// import TableServer from "../../../src/table/TableServer";
import {
  getUniqueName,
  // EMULATOR_ACCOUNT_KEY,
  // EMULATOR_ACCOUNT_NAME,
  // getUniqueName,
  overrideRequest,
  restoreBuildRequestOptions
} from "../../testutils";

// Set true to enable debug log
configLogger(false);

// Create Entity for tests
function createBasicEntityForTest() {
  return {
    PartitionKey: eg.String("part1"),
    RowKey: eg.String(getUniqueName("row")),
    myValue: eg.String("value1")
  };
}

const wildCardEtag = {
  ".metadata": {
    etag: "*" // forcing unconditional etag match to delete
  }
};

const eg = Azure.TableUtilities.entityGenerator;

describe("table Entity APIs test", () => {
  // TODO: Create a server factory as tests utils
  // const protocol = "http";
  // const host = "127.0.0.1";
  // const port = 11002;
  // const metadataDbPath = "__tableTestsStorage__";

  // const config = new TableConfiguration(
  //   host,
  //   port,
  //   metadataDbPath,
  //   false,
  //   false
  // );

  // let server: TableServer;
  const connectionString =
    process.env.azure_test_connection_string ||
    `<your Azure Connection String here>`;

  const tableService = Azure.createTableService(connectionString);

  const tableName: string = "TestingAzurite"; //  getUniqueName("table");

  const requestOverride = { headers: {} };

  before(() => {
    overrideRequest(requestOverride, tableService);
    // server = new TableServer(config);
    // tableName = getUniqueName("table");
    // await server.start();
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };

    // tableService.createTable(tableName, (error, result, response) => {
    //   // created table for tests
    //   // this is taking some time in the service...
    //   if (error) {
    //     assert.ifError(error);
    //   } else {
    //     // tslint:disable-next-line: no-console
    //     console.log("Create Table Response : " + response.statusCode);
    //     // tslint:disable-next-line: no-console
    //     console.log("sleeping...");
    //     // sleep(10000);
    //     // tslint:disable-next-line: no-console
    //     console.log("awake...");
    //   }
    // });
  });

  after(async () => {
    // await server.close();
    restoreBuildRequestOptions(tableService);
  });

  // Simple test in here until we have the full set checked in, as we need
  // a starting point for delete and query entity APIs
  it("Should insert new Entity, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/insert-entity
    const entity = createBasicEntityForTest();
    tableService.insertEntity(tableName, entity, (error, result, response) => {
      assert.equal(response.statusCode, 201);
      done();
    });
  });

  it("Should delete an Entity using etag wildcard, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1

    const entityOld = createBasicEntityForTest();

    tableService.insertEntity(
      tableName,
      entityOld,
      (error, result, response) => {
        assert.equal(response.statusCode, 201);
        /* https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1#request-headers
      If-Match	Required. The client may specify the ETag for the entity on the request in
      order to compare to the ETag maintained by the service for the purpose of optimistic concurrency.
      The delete operation will be performed only if the ETag sent by the client matches the value
      maintained by the server, indicating that the entity has not been modified since it was retrieved by the client.
      To force an unconditional delete, set If-Match to the wildcard character (*). */

        const entityToDelete = { ...entityOld, ...wildCardEtag };

        tableService.deleteEntity(
          tableName,
          entityToDelete,
          (_errorDelete, responseDelete) => {
            assert.equal(responseDelete.statusCode, 204);
            done();
          }
        );
      }
    );
  });

  it("Should not delete an Entity not matching Etag, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1
    const entityInsert = createBasicEntityForTest();

    const shouldNotMatch = {
      ".metadata": {
        etag: "0x2252C97588D4000"
      }
    };
    const entityDelete = { ...entityInsert, ...shouldNotMatch };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (insertError, insertResult, insertResponse) => {
        if (!insertError) {
          requestOverride.headers = {};
          tableService.deleteEntity(
            tableName,
            entityDelete,
            (deleteError, deleteResponse) => {
              assert.equal(deleteResponse.statusCode, 412); // Precondition failed
              done();
            }
          );
        } else {
          assert.ifError(insertError);
          done();
        }
      }
    );
  });

  it("Should delete a matching Etag, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1
    const entityInsert = createBasicEntityForTest();
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        if (!error) {
          requestOverride.headers = {};
          tableService.deleteEntity(
            tableName,
            result, // SDK defined entity type...
            (deleteError, deleteResponse) => {
              if (!deleteError) {
                assert.equal(deleteResponse.statusCode, 204); // Precondition succeeded
                done();
              } else {
                assert.ifError(deleteError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Update an Entity that exists, @loki", done => {
    const entityInsert = createBasicEntityForTest();
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        if (!error) {
          requestOverride.headers = {};
          const entityReplace = entityInsert;
          entityReplace.myValue = eg.String("newValue");
          tableService.replaceEntity(
            tableName,
            entityReplace,
            (updateError, updateResult, updateResponse) => {
              if (!updateError) {
                assert.equal(updateResponse.statusCode, 204); // Precondition succeeded
                // ToDo: Query Entity and check value once query entity is implemented.
                done();
              } else {
                assert.ifError(updateError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Update an Entity that does not exist, @loki", done => {
    // ToDo: Tidy up test and decouple from previous test.
    tableService.replaceEntity(
      tableName,
      { PartitionKey: "part1", RowKey: "row4", myValue: "newValue" },
      (updateError, updateResult, updateResponse) => {
        const castUpdateStatusCode = (updateError as StorageError).statusCode;
        if (updateError) {
          assert.equal(castUpdateStatusCode, 409);
          done();
        } else {
          assert.fail("Test failed to throw the right Error" + updateError);
        }
      }
    );
  });

  it("Should not update an Entity not matching Etag, @loki", done => {
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "row4",
      myValue: "oldValue"
    };
    const entityUpdate = {
      PartitionKey: "part1",
      RowKey: "row4",
      myValue: "oldValueUpdate",
      ".metadata": {
        etag: "0x2252C97588D4000"
      }
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (insertError, insertResult, insertResponse) => {
        if (!insertError) {
          requestOverride.headers = {};
          tableService.replaceEntity(
            tableName,
            entityUpdate,
            (updateError, updateResponse) => {
              const castUpdateStatusCode = (updateError as StorageError)
                .statusCode;
              assert.equal(castUpdateStatusCode, 412); // Precondition failed
              done();
            }
          );
        } else {
          assert.ifError(insertError);
          done();
        }
      }
    );
  });

  it("Should update, if Etag matches, @loki", done => {
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "row5",
      myValue: "oldValue"
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        const etagOld = result[".metadata"].etag;
        const entityUpdate = {
          PartitionKey: "part1",
          RowKey: "row5",
          myValue: "oldValueUpdate",
          ".metadata": {
            etag: etagOld
          }
        };
        if (!error) {
          requestOverride.headers = {};
          tableService.replaceEntity(
            tableName,
            entityUpdate,
            (updateError, updateResult, updateResponse) => {
              if (!updateError) {
                assert.equal(updateResponse.statusCode, 204); // Precondition succeeded
                done();
              } else {
                assert.ifError(updateError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Insert or Replace (upsert) on an Entity that does not exist, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertOrReplaceEntity(
      tableName,
      {
        PartitionKey: "part1",
        RowKey: "row6",
        myValue: "firstValue"
      },
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 204); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          done();
        }
      }
    );
  });

  it("Insert or Replace (upsert) on an Entity that exists, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertOrReplaceEntity(
      tableName,
      {
        PartitionKey: "part1",
        RowKey: "row6",
        myValue: "newValue"
      },
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 204); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          done();
        }
      }
    );
  });

  it("Insert or Merge on an Entity that exists, @loki", done => {
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "merge1",
      myValue: "oldValue"
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        const entityUpdate = {
          PartitionKey: "part1",
          RowKey: "merge1",
          mergeValue: "newValue"
        };
        if (!error) {
          requestOverride.headers = {};
          tableService.insertOrMergeEntity(
            tableName,
            entityUpdate,
            (updateError, updateResult, updateResponse) => {
              if (!updateError) {
                assert.equal(updateResponse.statusCode, 204); // Precondition succeeded
                // TODO When QueryEntity is done - validate Entity Properties
                done();
              } else {
                assert.ifError(updateError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Insert or Merge on an Entity that does not exist, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertOrMergeEntity(
      tableName,
      {
        PartitionKey: "part1",
        RowKey: "row8",
        myValue: "firstValue"
      },
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 204); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          done();
        }
      }
    );
  });

  it.only("Simple batch test: Inserts multiple entities as a batch, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    const batchEntity1 = createBasicEntityForTest();
    const batchEntity2 = createBasicEntityForTest();
    const batchEntity3 = createBasicEntityForTest();

    const entityBatch: Azure.TableBatch = new Azure.TableBatch();
    entityBatch.addOperation("INSERT", batchEntity1, { echoContent: true });
    entityBatch.addOperation("INSERT", batchEntity2, { echoContent: true });
    entityBatch.addOperation("INSERT", batchEntity3, { echoContent: true });

    tableService.executeBatch(
      tableName,
      entityBatch,
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 202); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          done();
        }
      }
    );
  });
});
