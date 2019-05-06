#ifndef PRESENTATION_LAYER_H
#define PRESENTATION_LAYER_H
#include "types.hpp"
#include "../include/application.hpp"
#include "../include/transfer.hpp"

// A simple class responsible for the conversion of data between the forms of CircularQueue
// and DataPacket

class PresentationLayer {
private:
    uint16_t packet_size;

    std::vector<uint8_t> pack_Response(Message_To_Pre message);
    std::vector<uint8_t> pack_Config(Message_To_Pre message);
    //client is sender client
    std::vector<uint8_t> pack_TextUserName(Client * client);    
    std::vector<uint8_t> pack_Text(Client * client);  

    std::vector<uint8_t> pack_HistoryUserName(Message_To_Pre * message, std::string host_name);
    std::vector<uint8_t> pack_History(Message_To_Pre * message);

   // vector<uint8_t> pack_String(Message_To_Pre message);




    unsigned char * unpack_String(DataPacket packet);
    Message_To_App  unpack_Configuration(DataPacket packet);
    Message_To_App  unpack_GroupTextUserList(DataPacket packet);

public:
    PresentationLayer() = default;

    bool check_passwordFormat(unsigned char *password);
    //function: check password format
    //status: recv
    //precondition: recv new password from client
    //return:
    //      true: valid password format
    //      false: invalid password format
    //fromat:
    //      maxLength  = 28
    //      minLength  = 8
    
    StatusCode pack_Message(Client *client);
    // function: pack Message from appLayer
    // status: send
    // precondition: message.type_ matches the state machine
    // return:
    //         OK: pack message and write to client.send_buffer
    //         Error: message.type_ doesn't match the state machine
    
    StatusCode unpack_DataPacket(Client *client);
    // function: unpack DataPacket from transLayer
    // status: recv
    // precondition: client->recv_buffer.dequeue() returns a DataPacket
    // return: 
    //         OK:  unpack a DataPacket from recv_buffer and write Message_To_App succeed
    //         NoCompletePacket:   no complete packet in recv_buffer
};

#endif
