import express from "express";
const router = express.Router();

router.post("/users", (req, res) => {
  const  authorization  = req.headers["authorization"];
  res.status(201).json({ message: "User created", data:  authorization  });
});

router.get("/me", (_, res) => {
  
  res.status(200);
});

export default router;
