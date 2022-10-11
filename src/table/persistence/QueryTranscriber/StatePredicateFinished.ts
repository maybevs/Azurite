import IQPState from "./IQPState";
import QPState from "./QPState";
import QueryContext from "./QueryContext";
import { QueryStateName } from "./QueryStateName";

export default class StatePredicateFinished
  extends QPState
  implements IQPState
{
  name = QueryStateName.PredicateFinished;
  onProcess = (context: QueryContext) => {
    // tslint:disable-next-line: no-console
    console.log("predicate finished processing");

    // ToDo: if finished ?
    let token = "";
    [context, token] = this.determineNextToken(context);

    context.transcribedQuery += ` ${token}`;
    context.currentPos += token.length;

    if (context.currentPos === context.originalQuery.length) {
      context.stateQueue.push(QueryStateName.QueryFinished);
    } else {
      [context, token] = this.determineNextToken(context);
      context = this.handleToken(context, token);
    }

    return context;
  };

  onExit = (context: QueryContext) => {
    // tslint:disable-next-line: no-console
    console.log("predicate finished exit");

    // validate current predicate?

    return context;
  };
}
