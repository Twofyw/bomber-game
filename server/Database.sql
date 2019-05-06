use db1551713;
drop table if exists account;

create table account (
username varchar(30) BINARY not null,
password varchar(100) not null
);
alter table account add primary key(username);

insert into account(username, password) values('Novate', MD5('123456'));
insert into account(username, password) values('Twofyw', MD5('123456'));
insert into account(username, password) values('Larry', MD5('123456'));
