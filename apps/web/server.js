import express from "express";
import compression from "compression";
import path from "node:path";

const app = express();
const port = process.env.PORT || 4173;
const distPath = path.join(process.cwd(), "dist");

app.use(compression());
app.use(express.static(distPath));

app.get("*",(req,res)=>{
  res.sendFile(path.join(distPath,"index.html"));
});

app.listen(port, () => {
  console.log(`Cyberstreams Web Console listening on port ${port}`);
});
