using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using System.Threading.Tasks;
using Azure.Data.Tables;
using System.Collections;
namespace AzuriteTableTest
{
  [TestFixture]
  public class DataTablesTests
  {

    [SetUp]
    public void Setup()
    {
    }

    // from issue 793
    [Test]
    public async Task CheckForPreconditionFailedError()
    {
      var client = new TableServiceClient("UseDevelopmentStorage=true");
      var table = client.GetTableClient("test");
      await table.CreateIfNotExistsAsync();

      var pk = Guid.NewGuid().ToString();
      var rA = await table.AddEntityAsync(new TableEntity(pk, "a"));
      await table.UpsertEntityAsync(new TableEntity(pk, "a"));

      var actions = new[]
      {
                new TableTransactionAction(TableTransactionActionType.UpdateReplace, new TableEntity(pk, "a"), rA.Headers.ETag.Value),
            };

      try
      {
        await table.SubmitTransactionAsync(actions);
      }
      catch (TableTransactionFailedException ex)
      {
        // When replacing an entity with an etag condition, the Azurite table emulator should not
        // accept the entity replace if the etag is wrong.
        // (i.e.does not match the current entity state).
        // Azure and the legacy emulator return HTTP 412 Precondition failed.
        Assert.AreEqual(ex.Status, 412);
        // we got the expected error so should pass the test
        Assert.Pass();
      }
      // we did not land in the try catch so should fail
      Assert.Fail();
    }

    // Issue 791 https://github.com/Azure/Azurite/issues/791
    [Test]
    public async Task CheckForCorrectHTTPStatusErrorCodeOnFailedTableTransaction()
    {
      var client = new TableServiceClient("UseDevelopmentStorage=true");
      var table = client.GetTableClient("test");
      await table.CreateIfNotExistsAsync();
      var pk = Guid.NewGuid().ToString();
      await table.AddEntityAsync(new TableEntity(pk, "a"));
      var actions = new[]
      {
                new TableTransactionAction(TableTransactionActionType.Add, new TableEntity(pk, "a")),
            };
      try
      {
        await table.SubmitTransactionAsync(actions);
      }
      catch (TableTransactionFailedException ex)
      {
        // HTTP Error 409 Conflict should be returned when trying to add an entity that already exists.
        Assert.AreEqual(ex.Status, 409);
        Assert.Pass(ex.ToString());
      }
      // we did not land in the try catch so should fail
      Assert.Fail();
    }

    // Issue 1286 https://github.com/Azure/Azurite/issues/1286
    [Test]
    public async Task CheckForETagUpdateDuringRapidChange()
    {
      var client = new TableServiceClient("UseDevelopmentStorage=true");
      var table = client.GetTableClient("test");
      await table.CreateIfNotExistsAsync();

      var pk = Guid.NewGuid().ToString();
      var rA = await table.AddEntityAsync(new TableEntity(pk, "a"));
      await table.UpsertEntityAsync(new TableEntity(pk, "a"));

      var actions = new[]
      {
                new TableTransactionAction(TableTransactionActionType.UpdateReplace, new TableEntity(pk, "a"), rA.Headers.ETag.Value),
            };

      try
      {
        await table.SubmitTransactionAsync(actions);
      }
      catch (TableTransactionFailedException ex)
      {
        Assert.Pass(ex.ToString());
      }

      Assert.Fail();
    }

    [Test]
    public async Task CheckForOperationReturningResourceNotFound()
    {
      var client = new TableServiceClient("UseDevelopmentStorage=true");

      var table = client.GetTableClient("test1");
      await table.CreateIfNotExistsAsync();

      var pk = Guid.NewGuid().ToString();

      try
      {
        var rA = await table.UpdateEntityAsync(new TableEntity(pk, "a"), new Azure.ETag("*"), TableUpdateMode.Merge);
        Console.WriteLine("Status : " + rA.Status);
      }
      catch (Exception ex)
      {
        Assert.AreEqual(ex.Message, "The specified resource does not exist.");
        Assert.Pass(ex.ToString());
      }

      Assert.Fail();
    }
  }
}
