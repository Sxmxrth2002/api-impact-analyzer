import axios from "axios";

export async function getUser() {
  const response = await fetch("https://api.example.com/users/123");

  const user = await response.json();

  console.log(user.name);
  return user;
}

export async function createUser() {
  const response = await fetch("https://api.example.com/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Samarth",
    }),
  });

  return response.json();
}

export async function updateUser() {
  return axios.patch("https://api.example.com/users/123", { name: "Updated" });
}

export async function deleteUser() {
  return axios({
    method: "DELETE",
    url: "https://api.example.com/users/123",
  });
}

export async function getUserWithAxios() {
  const response = await axios.get("https://api.example.com/users/456");

  const user = response.data;

  console.log(user.name);
  console.log(user.email);

  return user;
}
