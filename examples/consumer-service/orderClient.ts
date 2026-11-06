import axios from "axios";

export async function getOrderUser() {
  const response = await axios.get("https://api.example.com/users/555");

  console.log(response.data.name);
}

export async function createOrderUser() {
  await axios.post("https://api.example.com/users", {
    name: "Alice",
  });
}
