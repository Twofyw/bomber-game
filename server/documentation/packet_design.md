

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
|                   |            |
|                   |            |
|                   |            |
|                   |            |
|                   |            |

------------------------

#### info `0x00`

|  0   |         1 , 2         |     3 ... 31      |
| :--: | :-------------------: | :---------------: |
| 0x00 | info_length (2 bytes) | data（user_name） |

#### info_response `0x01`

|  0   |  1, 2  |      3       |
| :--: | :----: | :----------: |
| 0x01 | 0x0001 | ResponseType |

 > **ResponseType:**
 >
 > > >|         0x0         | 0x1  |     0x4     |
 > > >| :-----------------: | :--: | :---------: |
 > > >| user does not exist |  OK  | ErrorOccurs |

#### passwd `0x02`

|  0   |          1 , 2          |        3 ... 31         |
| :--: | :---------------------: | :---------------------: |
| 0x02 | passwd_length (2 bytes) | password (28 bytes max) |

#### passwd_response `0x03`

|  0   |  1, 2  |      3       |
| :--: | :----: | :----------: |
| 0x03 | 0x0001 | ResponseType |

> **ResponseType:**

> | 0x1  |  0x3  |     0x4     |
> | :--: | :---: | :---------: |
> |  OK  | wrong | ErrorOccurs |
> 密码错误client直接踢掉

#### refuse  `0x04`

|  0   |  1, 2  |      3       |
| :--: | :----: | :----------: |
| 0x04 | 0x0001 | responseType |

>**ResponseType:**
>
>|   **0x4**   |     **0x5**     |
>| :---------: | :-------------: |
>| ErrorOccurs | AlreadyLoggedIn |





-----------

## Synchronization

### Frame types(Synchronization)

| frame type | descriptor |
| :--------: | :--------: |
|            |            |
|            |            |
|            |            |
|            |            |

#### OnlineList -> UserName  `0x06`

|  0   |            1, 2            |         3 ... 31         |
| :--: | :------------------------: | :----------------------: |
| 0x06 | user_name length (2 bytes) | user_name (host to user) |

#### SyncEnd   `0x08`

1 byte

|  0   | 1， 2  |  3   |
| :--: | :----: | :--: |
| 0x08 | 0x0000 |  0   |





------------------------

## Game


**SendInvit** **0x09**

|  0   |            1,2             |         3... 31          |
| :--: | :------------------------: | :----------------------: |
| 0x09 | user_name length (2 bytes) | user_name (host to user) |


**RecvInvit** **0x0A**

|  0   |            1,2             |         3... 31          |
| :--: | :------------------------: | :----------------------: |
| 0x0A | user_name length (2 bytes) | user_name (host to user) |

**InvitResponse** **0x0B**

|  0   | 1,2  |      3       |
| :--: | :--: | :----------: |
| 0x0A |  1   | ResponseType |

  >**ResponseType:**
  >
  >|      0       |  1   |      2      |  6   |
  >| :----------: | :--: | :---------: | :--: |
  >| UserNotExist |  OK  | RefuseInvit | Busy |

 

**Board 0x0C**

|  0   | 1,2  |                           3... 14                            |
| :--: | :--: | :----------------------------------------------------------: |
| 0x0C |  12  | $ h_1(x,y), t_1(x,y), h_2(x,y), t_2(x,y), h_3(x,y), t_3(x,y) $ |



**SingleCoord 0x0D**

|  0   | 1,2  | 3,4  |
| :--: | :--: | :--: |
| 0x0D |  2   | x,y  |



**DoubleCoord 0x0E**

|  0   | 1,2  |          3,4          |
| :--: | :--: | :-------------------: |
| 0x0E |  4   | $ h_x, h_y, t_x,t_y $ |



**GameOver 0x0F**

|  0   | 1,2  |  3   |
| :--: | :--: | :--: |
| 0x0F |  0   | null |

