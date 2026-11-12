import { API } from "@stoplight/elements";
import spec from "../.cache/api.yaml?raw";

export default function App() {
  return <API apiDescriptionDocument={spec} router="hash" layout="sidebar" />;
}
