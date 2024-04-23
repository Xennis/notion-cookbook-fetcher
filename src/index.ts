import * as ff from '@google-cloud/functions-framework';
import {run} from "./notion";

ff.http('updateGET', async (req: ff.Request, res: ff.Response) => {
  await run()
  res.send('Hello World!');
});
