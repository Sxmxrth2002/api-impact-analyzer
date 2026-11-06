import axios from "axios";

const payload: { name: string; email?: string } = {
  name: "John",
};

payload.email = "john@example.com";

axios.post("https://api.example.com/users", payload);
