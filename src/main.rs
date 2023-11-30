use serde::Deserialize;
use std::process::Stdio;
use std::fs;
use std::error::Error;
use tokio::process::Command; // Use Tokio's Command
use tokio::io::{AsyncWriteExt, BufReader, AsyncBufReadExt};
use sgf_parse::go::{Move, Prop, Point};
use sgf_parse::SgfNode;


#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct Config {
    katago: KatagoConfig,
    save: SaveConfig,
    analysis: AnalysisConfig,
    batch: BatchConfig,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct KatagoConfig {
    engine: String,
    model: String,
    config: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct SaveConfig {
    ai_branches: bool,
    ai_winrate: bool,
    ai_visits: bool,
    human_winrate: bool,
    as_new_file: bool,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct AnalysisConfig {
    max_visits: u32,
    rules: String,
    komi: f32,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct BatchConfig {
    cooldown: u64,
}

type GameMove = (String, Point);

#[allow(dead_code)]
struct GameNode {
    game_move: GameMove,
    comment: String,
    children: Vec<GameMove>,
}

fn gametree_to_array(node: &SgfNode<Prop>) -> Vec<GameMove> {
    let mut moves = Vec::new();

    for prop in node.properties() {
        match prop {
            Prop::B(Move::Move(point)) => moves.push(("B".to_string(), *point)),
            Prop::W(Move::Move(point)) => moves.push(("W".to_string(), *point)),
            _ => {}
        }
    }

    if !node.children.is_empty() {
        moves.append(&mut gametree_to_array(&node.children[0]));
    }

    moves
}

async fn analyze_game(mut engine: tokio::process::Child, moves: Vec<GameMove>, max_visits: u32) -> Result<Vec<GameNode>, Box<dyn Error>> {
    let stdin = engine.stdin.as_mut().ok_or_else(|| std::io::Error::new(std::io::ErrorKind::Other, "Failed to open stdin"))?;
    let mut stdout = BufReader::new(engine.stdout.take().expect("Failed to open stdout"));

    let mut results = Vec::new();
    let mut current_moves: Vec<GameMove> = vec![];

    println!("Starting process...'\n'");

    for (index, node) in moves.iter().enumerate() {
        current_moves.push(node.clone());
        let moves_data: Vec<Vec<String>> = current_moves.clone()
        .iter()
        .map(|(color, point)| {
            let col = char::from_u32('A' as u32 + point.x as u32 - 1).unwrap_or('?');
            let row = point.y as u32 + 1; // Convert 0-based to 1-based indexing
            vec![color.clone(), format!("{}{}", col, row)]
        })
        .collect();

        let query = serde_json::json!({
            "id": index.to_string(),
            "moves": moves_data,
            "rules": "chinese",
            "komi": 7.5,
            "boardXSize": 19,
            "boardYSize": 19,
            "includePolicy": true,
            "kata_analysis": true,
            "includeOwnership": true,
            "maxVisits": &max_visits
        });

        // Write query to stdin and read response from stdout
        println!("{:?}", &query);
        stdin.write_all((query.to_string() + "\n").as_bytes()).await?;
        stdin.flush().await?;

        let mut response = String::new();
        stdout.read_line(&mut response).await?;
        
        println!("{:?} \n", &response);
        // Process the response and construct GameNode
        // This is a placeholder - you'll need to replace it with actual logic
        let game_node = GameNode {
            game_move: node.clone(),
            comment: String::from("Some comment"), // Replace with actual comment
            children: vec![], // Replace with actual children
        };

        results.push(game_node);
    }

    Ok(results)
}


fn read_settings(path: &str) -> Result<Config, Box<dyn std::error::Error>> {
    let contents = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            println!("Error reading file: {}", e);
            return Err(e.into());
        },
    };

    let config = match toml::from_str(&contents) {
        Ok(c) => c,
        Err(e) => {
            println!("Error parsing TOML: {}", e);
            return Err(e.into());
        },
    };

    Ok(config)
}


fn main() {
    let settings = read_settings("src/config.toml").expect("Failed to read settings");
    println!("Settings: {:?} \n", settings);
   
    let engine = Command::new(&settings.katago.engine)
        .args(["analysis", "-config", &settings.katago.config, "-model", &settings.katago.model])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("Failed to start AI engine");

    let sgf = fs::read_to_string("c:/SGFLibrary/test_file.sgf")
        .expect("Unable to read file");

    let tree = sgf_parse::go::parse(&sgf).unwrap();
    let moves = gametree_to_array(&tree[0]);
    println!("{:?} \n", &moves);
    let max_visits = settings.analysis.max_visits;
    tokio::runtime::Runtime::new().unwrap().block_on(analyze_game(engine, moves, max_visits)).expect("Failed to analyze game");
}