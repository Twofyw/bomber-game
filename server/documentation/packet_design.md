# Simple Chat Room Package Design  

## Frame type (all)

|  message meta type  | descriptor |
| :-----------------: | :--------: |
|        info         |    0x00    |
|    info_respond     |    0x01    |
|  passwd/new_passwd  |    0x02    |
|   passwd_respond    |    0x03    |
|       refuse        |    0x04    |
|      configure      |    0x05    |
|  history_user_name  |    0x06    |
|       history       |    0x07    |
| synchronization_end |    0x08    |
|      text_user      |    0x09    |
|        text         |    0x0A    |
|      file_name      |    0x0B    |
|   file_in_progress  |    0x0C    |
| group_text_userlist |    0x0D    |
|       file_end      |    0x0E    |
|      file_username      |    0x0F    |

------------------------

## Log In

### Frame types(Log In)

| message meta type | descriptor |
| :---------------: | :--------: |
|       info        |    0x00    |
|   info_respond    |    0x01    |
| passwd/new_passwd |    0x02    |
|  passwd_respond   |    0x03    |
|      refuse       |    0x04    |

------------------------

#### info `0x00`

|  0   |         1 , 2         |     3 ... 31      |
| :--: | :-------------------: | :---------------: |
| 0x00 | info_length (2 bytes) | data（user_name） |

#### info_response `0x01`

|  0   |  1, 2  |      3       |
| :--: | :----: | :----------: |
| 0x01 | 0x0001 | respond type |

 > **respond type:**
 >
 >|         0x0         |   0x1   |
 >| :-----------------: | :-----: |
 >| user does not exist | succeed |
 >
 >

#### passwd `0x02`

|  0   |          1 , 2          |        3 ... 31         |
| :--: | :---------------------: | :---------------------: |
| 0x02 | passwd_length (2 bytes) | password (28 bytes max) |

#### passwd_response `0x03`

|  0   |  1, 2  |          3          |
| :--: | :----: | :-----------------: |
| 0x03 | 0x0001 | passwd_respond type |

> **passwd_respond type:**

> |   0x1   |      0x2      |  0x3  |
> | :-----: | :-----------: | :---: |
> | correct | change passwd | wrong |
> 密码错误client直接踢掉

#### new_passwd `0x02`

|  0   |          1 , 2          |        3 ... 31         |
| :--: | :---------------------: | :---------------------: |
| 0x02 | passwd_length (2 bytes) | password (28 bytes max) |

#### refuse  `0x04`

|  0   |  1, 2  |  3   |
| :--: | :----: | :--: |
| 0x04 | 0x0000 |  0   |

------------------------

## Synchronization

### Frame types(Synchronization)

|     frame type      | descriptor |
| :-----------------: | :--------: |
|      configure      |    0x05    |
|  history_user_name  |    0x06    |
|       history       |    0x07    |
| synchronization_end |    0x08    |

#### configure  `0x05`

|  0   |  1, 2  |          3, 4           |   5, 6, 7   |  8, 9, 10   |
| :--: | :----: | :---------------------: | :---------: | :---------: |
| 0x05 | 0x0008 | record_length (2 bytes) | color (RGB) | color (RGB) |

#### history_user_name  `0x06`

|  0   |            1, 2            |   3    |         4 ... 31         |
| :--: | :------------------------: | :----: | :----------------------: |
| 0x06 | user_name length (2 bytes) | direct | user_name (host to user) |

direct: 

​	0 	 me -> others

​	1 	others -> me

#### history  `0x07`

|  0   |     1, 2      | 3 ... record_length+3 |
| :--: | :-----------: | :-------------------: |
| 0x07 | record_length |        record         |

#### synchronization _end   `0x08`

1 byte

|  0   | 1， 2  |  3   |
| :--: | :----: | :--: |
| 0x08 | 0x0000 |  0   |

------------------------

## Communication

### Message meta

|  message meta type  | descriptor |
| :-----------------: | :--------: |
|      text_user      |    0x09    |
|      fil_name       |    0x0B    |
| group_text_userlist |    0x0F    |

### Sending message

#### text_user `0x09`

32 bytes

|  0   |           1 , 2            |         3 ... 31         |
| :--: | :------------------------: | :----------------------: |
| 0x09 | user_name_length (2 bytes) | user_name (28 bytes max) |

#### text `0x0A`

max : 1024 bytes

|  0   |          1 , 2           |  3 ... (message_length + 3)   |
| :--: | :----------------------: | :---------------------------: |
| 0x0A | message_length (2 bytes) | message_data (1021 bytes max) |

### Sending file

#### file_username `0x0F`

|  0   |           1 , 2            |         3 ... 31         |
| :--: | :------------------------: | :----------------------: |
| 0x0F | file_username_length (2 bytes) | file_username (28 bytes max) |

#### file_name `0x0B`

|  0   |           1 , 2            |         3 ... 31         |
| :--: | :------------------------: | :----------------------: |
| 0x0B | file_name_length (2 bytes) | file_name (28 bytes max) |

#### file_in_progress `0x0C`

max : 1024 bytes

|  0   |                            1 , 2                             |   3 ... (file_length+3)    |
| :--: | :----------------------------------------------------------: | :------------------------: |
| 0x0C | file_length (2 bytes) (0 if remaining file_length > 1021 else file_length) | file_data (1021 bytes max) |

### Sending group message

#### group_text_userlist `0x0D`

1024 bytes

|  0   |              1, 2              |  3 ... 1024   |
| :--: | :----------------------------: | :-----------: |
| 0x0D | username_list_length (2 bytes) | username_list |

> username_list 包含最后一个username的 `'\0'`

#### message `0x0A`

max : 1024 bytes

|  0   |          1 , 2           |  3 ... (message_length + 3)   |
| :--: | :----------------------: | :---------------------------: |
| 0x0A | message_length (2 bytes) | message_data (1021 bytes max) |
