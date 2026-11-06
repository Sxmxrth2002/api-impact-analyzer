import axios from "axios";

const payload = { name: "John" };
const alias = payload;

Object.assign(alias, {
  email: "john@example.com",
});

axios.post("https://api.example.com/users", payload);
