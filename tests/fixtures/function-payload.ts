import axios from "axios";

const payload = { name: "John" };

function addEmail(obj: Record<string, unknown>) {
  obj.email = "john@example.com";
}

addEmail(payload);

axios.post("https://api.example.com/users", payload);
