#ifndef TYPES_HPP
#define TYPES_HPP
#include <vector>
#include <arpa/inet.h>
#include <stdint.h>
#include <string>
#include "Log.h"

#include <algorithm>    // std::max
#include <queue>
#include <list>

#include <errno.h>
#include <fcntl.h>
#include <ifaddrs.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <signal.h>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/prctl.h>

using namespace fly;

#define graceful_return(s, x) {\
    perror((s));\
    return((x)); }

const int MaxHistoryLen = 300;
const int MaxFileLen = 1021;    // 1 KB    

// Constants
const size_t kSessionSetSize = 5; // max number of active sessions
const unsigned int kHeaderSize = 3; // network packet header size
const size_t kMaxPacketLength = 1024; // TODO: double check on this number
const size_t kRecvBufferSize = kMaxPacketLength;

// used as the first byte of data packets
enum class PacketType : uint8_t {
    Info = 0x00,
    InfoResponse = 0x01,
    Password = 0x02,
    PasswordResponse = 0x03,
    Refuse = 0x04,
    Configuration = 0x05,
    HistoryUserName = 0x06,
    History = 0x07,
    SyncEnd = 0x08,
    TextUsername = 0x09,
    Text = 0x0A,
    FileName = 0x0B,
    FileInProgress = 0x0C,
    GroupTextUserlist = 0x0D,
    FileEnd = 0x0E,
    FileUsername = 0x0F,
};

struct DataPacketHeader {
    PacketType type;
    uint16_t payload_size;
};
    
struct DataPacket {
    PacketType type;
    std::vector<uint8_t> data;
};

// status codes
enum class StatusCode : int {
    OK = 0,
    OpenFile = -1,
    LogInit = -2,
    RecvError = -3,
    RecvPartial = -4,
    RecvComplete = -5,
    SendError = -6,
    SendPartial = -7,
    SendComplete = -8,
    Accept = -9,
    CreateSocket = -10,
    Setsockopt = -11,
    Bind = -12,
    Listen = -13,

    //present layer error code : start from -20
    NoCompletePacket = -20
};

// Server response type
enum class ResponseType : uint8_t {
    UserNotExist = 0,
    OK = 1,
    ChangePassword = 2,
    WrongPassword = 3,
    ErrorOccurs = 4,
    AlreadyLoggedIn = 5,
};

// State machine definition
// Defined almost sequentially. Actions corresponding to a state are in comments.
enum class SessionState : unsigned int {
    Acceptance,         // On acceptance, create a new client instance
    Error,
    WaitForPasswd,
	WaitForNewPasswd,
    ServerWaiting,      
	WaitForText,
};

// Used as a buffer in transfer layer, instantiated in Clients
class CircularQueue {

public:
    CircularQueue(size_t init_size);
    ~CircularQueue();
    uint8_t *data; // debug

    bool enqueue(const uint8_t *buf, const size_t size);
    bool dequeue(uint8_t *buf, const size_t size);
    uint16_t current_packet_size(); // note: this is actually the payload size

    // Also requires a getter method for _num_free_bytes here.
    size_t get_num_free_bytes() const;
    size_t size () const;
    bool is_empty();
    bool is_full();
    bool has_complete_packet(); // has at least one complete packet
    DataPacket dequeue_packet(); // return a complete packet

private:
    size_t _size;
    size_t _num_free_bytes;
    size_t front, rear;
};


struct Message_To_App{
    PacketType type_;
    std::string user_name_;
    std::string password_; 
    std::string media_text_;
    std::vector<std::string> user_name_list_;
    std::string file_name_;
    std::string media_file_;
    unsigned short config_; // 2 bytes in TransLayer
};

struct Message_To_Pre{
    PacketType type_;
    ResponseType respond_; 
    int config_;
    std::vector<std::string> history_;
};

// not sure if struct group_text should be kept or just use text[] instead ?
struct group_text{
    std::vector<std::string> user_list;
    std::string data;
};

struct file{
    std::string filePath;
};


// #endif

// #ifndef CLIENT_H
// #define CLIENT_H


struct Client {

    Client(int socket_fd, size_t buffer_size) : 
        socket_fd(socket_fd),
        recv_buffer(buffer_size) 
    {}

    int client_id;

    CircularQueue recv_buffer;
    std::queue< std::vector<uint8_t> > send_buffer;

    int socket_fd;
    SessionState state = SessionState::Acceptance;
    std::string host_username_;
    Message_To_App message_ptoa;
    Message_To_Pre message_atop;

    // should be always greater than kHeaderSize (reset to this)
    // updated when packet is received and on state change


    // ~Client(); // Should call the destructor of the underlying CircularQueue


};

#endif
