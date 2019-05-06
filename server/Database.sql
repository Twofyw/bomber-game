-- drop database if exists Simple_chat_room;
-- create database Simple_chat_room;

-- use Simple_chat_room;
use db1551713;
drop table if exists history;
drop table if exists account;

create table account (
username varchar(30) BINARY not null,
password varchar(100) not null,
history_count int unsigned default 100
);
alter table account add primary key(username);

insert into account(username, history_count, password) values('Cyanic', 1, MD5('123456'));
insert into account(username, password) values('Twofyw', MD5('123456'));
insert into account(username, password) values('YYYuna', MD5('123456'));
insert into account(username, password) values('novatez', MD5('123456'));

--drop table if exists history;
create table history (
message_id bigint unsigned,
username_main varchar(30) BINARY not null, 
username_sub varchar(30) BINARY not null, 
message_info varchar(100) not null default 'error'
);

alter table history add primary key(message_id); 
alter table history add CONSTRAINT FOREIGN KEY(username_main) REFERENCES account(username);
alter table history add CONSTRAINT FOREIGN KEY(username_sub) REFERENCES account(username);
