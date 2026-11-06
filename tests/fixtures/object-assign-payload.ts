import axios from "axios";

const payload = { name: "John" };

Object.assign(payload, {
  email: "john@example.com",
});

axios.post("https://api.example.com/users", payload);
