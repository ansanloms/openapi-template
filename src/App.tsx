import { API } from "@stoplight/elements";
import spec from "virtual:spec";

export default function App() {
  return <API apiDescriptionDocument={spec} router="hash" layout="sidebar" />;
}
