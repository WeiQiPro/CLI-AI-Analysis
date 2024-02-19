// import { ParseSGF } from "./game.js";

// const sgfFilePath =
//   "C:/Users/Donle/Downloads/61388987-212-sedgwick-TangJieHao.sgf";
// const sgftext = await Deno.readTextFile(sgfFilePath);
// let SGF = ParseSGF.parseSGFToGame(sgftext);

// console.log(SGF);

async function load_cli_config() {
  const config = {};
  const configPath = "./default.cfg";

  try {
    const configFileContents = await Deno.readTextFile(configPath);

    // Split the file into lines
    const lines = configFileContents.split("\n");

    // Process each line
    lines.forEach((line) => {
      // Ignore comments and empty lines
      if (line.startsWith("#") || line.trim() === "") return;

      const [key, value] = line.split("=");
      config[key.trim()] = value.trim();
    });

    console.log(config);
    return config;
  } catch (error) {
    console.error("Error reading config file:", error);
    return {}; // Return an empty config object in case of errors
  }
}

async function load_kata_go(config) {
  const command = new Deno.Command(config.EXE, {
    args: ["analysis", "-model", config.MODEL, "-config", config.CONFIG],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const process = await command.spawn();
  return process;
}

async function sendAnalysisRequest(process, requestObject) {
  const writer = process.stdin.getWriter();
  // Convert the request object to a JSON string and write it to stdin
  await writer.write(
    new TextEncoder().encode(JSON.stringify(requestObject) + "\n")
  );
  writer.releaseLock();
}

async function readAnalysisResult(process) {
  // Await the completion of the output() call to get the Uint8Array result.
  const outputBuffer = await process.output();
  console.log(outputBuffer);
  // Now decode the Uint8Array to a string.
  const outputText = new TextDecoder().decode(outputBuffer);
  return outputText.trim();
}

async function readStream(stream, handler) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = new TextDecoder().decode(value);
      handler(text); // Process the text chunk (e.g., log it or process it)
    }
  } catch (error) {
    console.error("Stream reading error:", error);
  } finally {
    reader.releaseLock();
  }
}

async function main() {
  const cli_kata_config = await load_cli_config();
  const katago = await load_kata_go(cli_kata_config);

  // Setup continuous reading of stdout and stderr
  readStream(katago.stdout, (text) => console.log("stdout:", text));
  readStream(katago.stderr, (text) => console.error("stderr:", text));

  // Example: Send an analysis request. Adapt this part as needed.
  const analysisRequest = {
    id: "foo",
    initialStones: [
      ["B", "Q4"],
      ["B", "C4"],
    ],
    moves: [
      ["W", "P5"],
      ["B", "P6"],
    ],
    rules: "tromp-taylor",
    komi: 7.5,
    boardXSize: 19,
    boardYSize: 19,
    analyzeTurns: [0, 1, 2],
    maxVisits: 2000,
  };

  const writer = katago.stdin.getWriter();
  await writer.write(
    new TextEncoder().encode(JSON.stringify(analysisRequest) + "\n")
  );
  writer.releaseLock();

  await katago.stdin.close();

  const status = await katago.status;
  console.log("Subprocess exited with:", status.code);
}

main().catch(console.error);

