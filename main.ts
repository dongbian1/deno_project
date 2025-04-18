import { getFileData, readFileCSV, readFileExcel } from "./pages/read/index.ts";
import { RouterItem, server } from './pages/request/index.ts'

// 路由配置
const routerArr: Array<RouterItem> = [
  { url: '/readFileCSV', method: 'GET', callback: readFileCSV },
  { url: '/readFileExcel', method: 'GET', callback: readFileExcel },
  { url: '/getFileData', method: 'GET', callback: getFileData },
]

if (import.meta.main) {
  server(routerArr)
}
