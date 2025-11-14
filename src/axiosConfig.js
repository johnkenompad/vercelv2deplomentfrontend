import axios from "axios";

axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000";
axios.defaults.headers.common["x-api-key"] = process.env.REACT_APP_API_KEY || "";

export default axios;
