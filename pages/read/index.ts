import { parse } from "@std/csv";
import { RouterContext } from "https://deno.land/x/oak@v17.1.4/router.ts";
import xlsx from "xlsx";
import { errorBody, successBody } from "../utils/bodyFormat.ts";
import { mysql } from "../utils/mysql.ts"

/**
 * 读取CSV文件
 * @param url 文件地址
 */
export const readFileCSV = async (ctx: RouterContext<string>) => {
  const url = ctx.request.url.searchParams.get("url")!;
  if (!url) {
    ctx.response.body = errorBody("缺少url参数");
    return
  }
  try {
    const file = await Deno.readTextFile(url);
    const data = parse(file, { skipFirstRow: true });
    ctx.response.body = successBody(data)
  } catch (_error) {
    ctx.response.body = errorBody('读取文件失败');
  }

};

/**
 * 读取Excel文件
 * @param url 文件地址
 */
export const readFileExcel = (ctx: RouterContext<string>) => {
  const url = ctx.request.url.searchParams.get("url");
  if (!url) {
    ctx.response.body = errorBody("缺少url参数");
    return
  }
  try {
    const file = xlsx.readFile(url);
    const name = file.SheetNames[0];
    const sheet = file.Sheets[name];
    const data = xlsx.utils.sheet_to_json(sheet);
    ctx.response.body = successBody(data);
  } catch (_error) {
    ctx.response.body = errorBody('读取文件失败');
  }
};

export const getFileData = async (ctx: RouterContext<string>) => {
  const fileName = ctx.request.url.searchParams.get("fileName");
  if (!fileName) {
    ctx.response.body = errorBody("缺少文件名称参数");
    return
  }
  const res = await mysql.batchInsert('set_data_info',[{ 'file_name': 'test1', 'data_table': 'test' }])
  ctx.response.body = successBody(res)
}
