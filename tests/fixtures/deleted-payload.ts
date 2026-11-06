import axios from "axios";

const payload: { name: string; email?: string } = {
  name: "John",
  email: "john@example.com",
};

delete payload.email;

axios.post("https://api.example.com/users", payload);
