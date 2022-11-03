import QueryContext from "./QueryContext";
import { QueryStateName } from "./QueryStateName";
import StatePredicateFinished from "./StatePredicateFinished";
import StatePredicateStarted from "./StatePredicateStarted";
import StateProcessIdentifier from "./StateProcessIdentifier";
import StateProcessOperator from "./StateProcessOperator";
import StateProcessValue from "./StateProcessValue";
import StateQueryFinished from "./StateQueryFinished";
import StateQueryStarted from "./StateQueryStarted";
import LokiJsQueryTranscriber from "./LokiJsQueryTranscriber";
import StateProcessPredicateOperator from "./StateProcessPredicateOperator";
import StateProcessParensOpen from "./StateProcessParensOpen";
import StateProcessParensClose from "./StateProcessParensClose";

export default class LokiJsQueryTranscriberFactory {
  public static createQueryTranscriber(
    queryString: string,
    name: string = "default"
  ): LokiJsQueryTranscriber {
    // initializes the data state for the query transcriber state machine
    const queryContext = new QueryContext(queryString);
    const transcriber = new LokiJsQueryTranscriber(queryContext, name);

    // Add the states to the transcriber.
    transcriber.addState(QueryStateName.QueryStarted, new StateQueryStarted());
    transcriber.addState(
      QueryStateName.ProcessParensOpen,
      new StateProcessParensOpen()
    );
    transcriber.addState(
      QueryStateName.ProcessParensClose,
      new StateProcessParensClose()
    );
    transcriber.addState(
      QueryStateName.PredicateStarted,
      new StatePredicateStarted()
    );
    transcriber.addState(
      QueryStateName.ProcessIdentifier,
      new StateProcessIdentifier()
    );
    transcriber.addState(
      QueryStateName.ProcessOperator,
      new StateProcessOperator()
    );
    transcriber.addState(
      QueryStateName.ProcessPredicateOperator,
      new StateProcessPredicateOperator()
    );
    transcriber.addState(QueryStateName.ProcessValue, new StateProcessValue());
    transcriber.addState(
      QueryStateName.PredicateFinished,
      new StatePredicateFinished()
    );
    transcriber.addState(
      QueryStateName.QueryFinished,
      new StateQueryFinished()
    );

    return transcriber;
  }
}
