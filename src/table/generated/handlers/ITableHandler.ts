/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */
// tslint:disable:max-line-length

import * as Models from "../artifacts/models";
import Context from "../Context";

export default interface ITableHandler {
  query(options: Models.TableQueryOptionalParams, context: Context): Promise<Models.TableQueryResponse2>;
  create(tableProperties: Models.TableProperties, options: Models.TableCreateOptionalParams, context: Context): Promise<Models.TableCreateResponse>;
  batch(body: NodeJS.ReadableStream, multipartContentType: string, contentLength: number, options: Models.TableBatchOptionalParams, context: Context): Promise<Models.TableBatchResponse>;
  delete(table: string, options: Models.TableDeleteMethodOptionalParams, context: Context): Promise<Models.TableDeleteResponse>;
  queryEntities(table: string, options: Models.TableQueryEntitiesOptionalParams, context: Context, batchID?: string): Promise<Models.TableQueryEntitiesResponse>;
  queryEntitiesWithPartitionAndRowKey(table: string, partitionKey: string, rowKey: string, options: Models.TableQueryEntitiesWithPartitionAndRowKeyOptionalParams, context: Context, batchID?: string): Promise<Models.TableQueryEntitiesWithPartitionAndRowKeyResponse>;
  updateEntity(table: string, partitionKey: string, rowKey: string, options: Models.TableUpdateEntityOptionalParams, context: Context, batchID?: string): Promise<Models.TableUpdateEntityResponse>;
  mergeEntity(table: string, partitionKey: string, rowKey: string, options: Models.TableMergeEntityOptionalParams, context: Context, batchID?: string): Promise<Models.TableMergeEntityResponse>;
  deleteEntity(table: string, partitionKey: string, rowKey: string, ifMatch: string, options: Models.TableDeleteEntityOptionalParams, context: Context, batchID?: string): Promise<Models.TableDeleteEntityResponse>;
  mergeEntityWithMerge(table: string, partitionKey: string, rowKey: string, options: Models.TableMergeEntityWithMergeOptionalParams, context: Context): Promise<Models.TableMergeEntityWithMergeResponse>;
  insertEntity(table: string, options: Models.TableInsertEntityOptionalParams, context: Context, batchID?: string): Promise<Models.TableInsertEntityResponse>;
  getAccessPolicy(table: string, options: Models.TableGetAccessPolicyOptionalParams, context: Context): Promise<Models.TableGetAccessPolicyResponse>;
  setAccessPolicy(table: string, options: Models.TableSetAccessPolicyOptionalParams, context: Context): Promise<Models.TableSetAccessPolicyResponse>;
}
