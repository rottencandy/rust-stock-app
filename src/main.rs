extern crate rusqlite;
extern crate serde_derive;
extern crate serde_json;
extern crate web_view;

use rusqlite::{params, Connection};
use serde_derive::{Deserialize, Serialize};
use web_view::*;

#[derive(Serialize, Deserialize)]
struct Item {
    id: i32,
    name: String,
    company: String,
    amount: String,
}
#[derive(Serialize, Deserialize)]
struct Request {
    cmd: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Item>,
}

#[derive(Serialize, Deserialize)]
struct Response {
    cmd: String,
    value: Vec<Item>,
}

fn get_list(conn: &Connection) -> Vec<Item> {
    let mut select_st = conn
        .prepare_cached("SELECT id, name, company, amount FROM stock")
        .unwrap();
    let list = select_st
        .query_map(params![], |row| {
            Ok(Item {
                id: row.get(0).unwrap(),
                name: row.get(1).unwrap(),
                company: row.get(2).unwrap(),
                amount: row.get(3).unwrap(),
            })
        })
        .unwrap();
    let mut items = Vec::new();
    for item in list {
        items.push(item.unwrap());
    }
    items
}

fn insert(conn: &Connection, name: String, company: String, amount: String) {
    let mut insert_st = conn
        .prepare_cached("INSERT INTO stock (name, company, amount) VALUES (?1, ?2, ?3)")
        .unwrap();
    insert_st.execute(params![name, company, amount]).unwrap();
}

fn update(conn: &Connection, id: i32, name: String, company: String, amount: String) {
    let mut update_st = conn
        .prepare_cached(
            "UPDATE stock
            SET name = ?2,
                company = ?3,
                amount = ?4
            WHERE
                id = ?1",
        )
        .unwrap();
    update_st
        .execute(params![id, name, company, amount])
        .unwrap();
}

fn delete(conn: &Connection, id: i32) {
    let mut update_st = conn
        .prepare_cached("DELETE FROM stock WHERE id = ?1")
        .unwrap();
    update_st.execute(params![id]).unwrap();
}

fn main() {
    let html_content = include_str!("frontend\\build\\app.html");

    let conn = Connection::open(".\\stock.db3").unwrap();
    conn.execute(
        "CREATE TABLE IF NOT EXISTS stock (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL,
            company TEXT NOT NULL,
            amount  TEXT NOT NULL
            )",
        params![],
    )
    .unwrap();

    web_view::builder()
        .title("Stock")
        .content(Content::Html(html_content))
        .size(800, 600)
        .resizable(true)
        .debug(true)
        .user_data(())
        .invoke_handler(|webview, arg| {
            let payload: Request = serde_json::from_str(arg).unwrap();
            let cmd = payload.cmd;

            match cmd.as_str() {
                "get" => {
                    let items = get_list(&conn);
                    let response = Response {
                        cmd: "get".to_owned(),
                        value: items,
                    };
                    let render_tasks =
                        format!("recieveData({})", serde_json::to_string(&response).unwrap());
                    webview.eval(&render_tasks)?;
                }
                "insert" => {
                    if let Some(d) = payload.data {
                        insert(&conn, d.name, d.company, d.amount);
                    }
                }
                "update" => {
                    if let Some(d) = payload.data {
                        update(&conn, d.id, d.name, d.company, d.amount);
                    }
                }
                "delete" => {
                    if let Some(d) = payload.data {
                        delete(&conn, d.id);
                    }
                }
                _ => unimplemented!(),
            }
            Ok(())
        })
        .run()
        .unwrap();
}
