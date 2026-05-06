import { onRequest as __api_clear_js_onRequest } from "C:\\Users\\admin\\Documents\\EDUARDO\\AZUL\\projeto_calendario\\functions\\api\\clear.js"
import { onRequest as __api_comments_js_onRequest } from "C:\\Users\\admin\\Documents\\EDUARDO\\AZUL\\projeto_calendario\\functions\\api\\comments.js"
import { onRequest as __api_data_js_onRequest } from "C:\\Users\\admin\\Documents\\EDUARDO\\AZUL\\projeto_calendario\\functions\\api\\data.js"
import { onRequest as __api_logs_js_onRequest } from "C:\\Users\\admin\\Documents\\EDUARDO\\AZUL\\projeto_calendario\\functions\\api\\logs.js"
import { onRequest as __api_sectors_js_onRequest } from "C:\\Users\\admin\\Documents\\EDUARDO\\AZUL\\projeto_calendario\\functions\\api\\sectors.js"
import { onRequest as __api_users_js_onRequest } from "C:\\Users\\admin\\Documents\\EDUARDO\\AZUL\\projeto_calendario\\functions\\api\\users.js"

export const routes = [
    {
      routePath: "/api/clear",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_clear_js_onRequest],
    },
  {
      routePath: "/api/comments",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_comments_js_onRequest],
    },
  {
      routePath: "/api/data",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_data_js_onRequest],
    },
  {
      routePath: "/api/logs",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_logs_js_onRequest],
    },
  {
      routePath: "/api/sectors",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_sectors_js_onRequest],
    },
  {
      routePath: "/api/users",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_users_js_onRequest],
    },
  ]