import { Request, Response } from "@elements/app";
import html from "./template";

export default function route(req: Request, res: Response, err: any) {
  return new html();
}
