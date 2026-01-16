import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("survey/:id", "routes/survey.tsx"),
] satisfies RouteConfig;
