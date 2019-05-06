#ifndef PRESENT_H
#define PRESENT_H
#include "../include/presentation.hpp"
// #include "../include/application.hpp"
// #include "../include/transfer.hpp"

extern ApplicationLayer AppLayerInstance;
extern TransferLayer TransLayerInstance;

using namespace std;

bool PresentationLayer::check_passwordFormat(unsigned char *password){
    unsigned char * ptr = password;
    if(!strcmp((char *)password, "123456")) return true;
    int count = 0;
    while((*ptr) != '\0'){
        count ++;
        ptr ++;
    }

    if(count < 8 || count > 28)
        return false;
    return true;
}

vector<uint8_t> PresentationLayer::pack_Response(Message_To_Pre message){
    static vector<uint8_t> temp;
    uint8_t* descriptor;
    uint16_t length;

    //descriptor
    descriptor = (uint8_t *)&message.type_;
    temp.clear();
    temp.push_back(*descriptor);

    switch(message.type_){
        case PacketType::InfoResponse:             
            //length = 1
            //length = htons((uint16_t)1 );    
            length = (uint16_t)1;

            temp.push_back((uint8_t)(length >> 8) );
            temp.push_back((uint8_t)(length) );
            temp.push_back(*((uint8_t*)&message.respond_));
            break;

        case PacketType::PasswordResponse:
            //length = 1
            //length = htons((uint16_t)1 );    
            length = (uint16_t)1;

            temp.push_back((uint8_t)(length >> 8) );
            temp.push_back((uint8_t)(length) );
            temp.push_back(*((uint8_t*)&message.respond_));
            break;

        case PacketType::SyncEnd:
            //length = 0
            temp.push_back((uint8_t)0); 
            temp.push_back((uint8_t)0);
            break;

        case PacketType::Refuse:
            //length = 1
            length = (uint16_t)1;
            temp.push_back((uint8_t)(length >> 8) ); 
            temp.push_back((uint8_t)length );
            temp.push_back(*((uint8_t*)&message.respond_));
            break;
    }

    return temp;
}

vector<uint8_t> PresentationLayer::pack_Config(Message_To_Pre message){
    static vector<uint8_t> temp;
    uint8_t descriptor;
    uint16_t length;
    uint16_t conf;

    temp.clear();

    //descriptor
    temp.push_back(*((uint8_t*)&message.type_));

    //conf length = 8
    length = (uint16_t)8;    
    temp.push_back((uint8_t)(length >> 8) );
    temp.push_back((uint8_t)(length) );

    //configure
    conf = (uint16_t)message.config_;
    temp.push_back((uint8_t)(conf >> 8) );
    temp.push_back((uint8_t)(conf) );

    //RGB
    temp.push_back((uint8_t)255);
    temp.push_back((uint8_t)255);
    temp.push_back((uint8_t)255);

    temp.push_back((uint8_t)255);
    temp.push_back((uint8_t)227);
    temp.push_back((uint8_t)132);
    return temp;
}

vector<uint8_t> PresentationLayer::pack_TextUserName(Client * client){
    vector<uint8_t> temp;
    uint8_t descriptor;
    uint16_t length;

    Message_To_App message = client->message_ptoa;

    //push back: descriptor
    temp.push_back((uint8_t)PacketType::TextUsername);

    //push back: user name length   (user name = client->host_username_)
    length = (uint16_t)client->host_username_.length();
    temp.push_back((uint8_t)(length >> 8) );
    temp.push_back((uint8_t)(length) );

    //push back: user name
    const char* c;
    c = client->host_username_.c_str();
    while((*c) != '\0'){
        temp.push_back((uint8_t)(*c) );
        c++;
    }

    return temp;
}

vector<uint8_t> PresentationLayer::pack_Text(Client * client){
    vector<uint8_t> temp;
    uint8_t descriptor;
    uint16_t length;

    Message_To_App message = client->message_ptoa;

    //push back: descriptor
    temp.push_back((uint8_t)PacketType::Text);

    //push back: text length
    length = (uint16_t)message.media_text_.length();
    temp.push_back((uint8_t)(length >> 8) );
    temp.push_back((uint8_t)(length) );

    //push back: text
    const char* c;
    c = message.media_text_.c_str();
    while((*c) != '\0'){
        temp.push_back((uint8_t)(*c) );
        c++;
    }

    return temp;
}

vector<uint8_t> PresentationLayer::pack_HistoryUserName(Message_To_Pre * message, string host_name){
    uint8_t direct;
    vector<uint8_t> temp;
    uint16_t length;
    string str;

    //push back: descriptor
    temp.push_back((uint8_t)PacketType::HistoryUserName);

    //direct
    str = *message->history_.begin();
    if(str == host_name)
        direct = 0; //me to others
    else
        direct = 1; //others to me

    //me to others
    if(direct == 0){    
        //erase host name
        message->history_.erase(message->history_.begin());     
        
        //push_back: user_name length
        str = *message->history_.begin(); 
        length = (uint16_t)(str.length() + 1);
        temp.push_back((uint8_t)(length >> 8) );
        temp.push_back((uint8_t)(length) );

        //push_back: direct
        temp.push_back(direct);

        //push_back: user_name
        const char* c;
        c = str.c_str();
        while((*c) != '\0'){
            temp.push_back((uint8_t)(*c) );
            c++;
        }

        message->history_.erase(message->history_.begin());     
    }
    //others to me
    else{    
        //push_back: user_name length
        str = *message->history_.begin(); 
        length = (uint16_t)(str.length() + 1);
        temp.push_back((uint8_t)(length >> 8) );
        temp.push_back((uint8_t)(length) );

        //push_back: direct
        temp.push_back(direct);

        //push_back: user_name
        const char* c;
        c = str.c_str();
        while((*c) != '\0'){
            temp.push_back((uint8_t)(*c) );
            c++;
        }

        //erase host name
        message->history_.erase(message->history_.begin());     
        message->history_.erase(message->history_.begin());     
    }

    return temp;
}

vector<uint8_t> PresentationLayer::pack_History(Message_To_Pre * message){
    vector<uint8_t> temp;
    uint8_t descriptor;
    uint16_t length;
    string str;

    //push back: descriptor
    if(message->type_ == PacketType::Configuration)
        temp.push_back((uint8_t)PacketType::History);

    if(message->type_ == PacketType::Text)
        temp.push_back((uint8_t)PacketType::Text);

    //push back: text length
    str = *message->history_.begin();
    length = (uint16_t)(str.length());
    temp.push_back((uint8_t)(length >> 8) );
    temp.push_back((uint8_t)(length) );

    //push back: text
    const char* c;
    c = str.c_str();
    while((*c) != '\0'){
        temp.push_back((uint8_t)(*c) );
        c++;
    }

    //erase text
    message->history_.erase(message->history_.begin());     

    return temp;
}

StatusCode PresentationLayer::pack_Message(Client *client){
    Client *recv_client;
    DataPacket packet;
    Message_To_Pre message, message_temp;
    vector<uint8_t> temp_str;
    unsigned char *temp_data;

    message = client->message_atop;

    //start packing:
    //WaitForPasswd or WaitForNewPasswd: send info/passwd response
    if((client->state == SessionState::WaitForPasswd) 
            || (client->state == SessionState::WaitForNewPasswd) 
            || (client->state == SessionState::Error)) {
        temp_str = pack_Response(message);
        client->send_buffer.push(temp_str);
    }

    //ServerWaiting: 
    if((client->state == SessionState::ServerWaiting) ){
        
        //slog in succeed, now synchronize 
        if(message.type_ == PacketType::Configuration){
            //sync config
            temp_str = pack_Config(message);
            client->send_buffer.push(temp_str);

            //sync history
            while(message.history_.size() != 0){
                //history user name
                temp_str = pack_HistoryUserName(&message, client->host_username_);
                client->send_buffer.push(temp_str);
                //history
                temp_str = pack_History(&message);
                client->send_buffer.push(temp_str);
            }
            cout << "client send_buffer length " << client->send_buffer.size() << endl;

            //Sync End
            message_temp.type_ = PacketType::SyncEnd;
            auto v = pack_Response(message_temp);
            cout << "v.size()" << v.size() << endl;
            client->send_buffer.push(v);
        }//end of Configuration

        //send Text to some other client
        if(message.type_ == PacketType::Text){
            //use message_ptoa to find the receiver client
            Message_To_App message_ptoa = client->message_ptoa;
            string client_name;
            
            vector<string>::iterator iter;
            //group chat
            if(message_ptoa.user_name_list_.size() != 0){
                while(message_ptoa.user_name_list_.size()){
                    //find recv user
                    iter = message_ptoa.user_name_list_.begin();
                    client_name = *iter;
                    recv_client = TransLayerInstance.find_by_username(client_name);
                    
                    //pack text user name
                    temp_str = pack_TextUserName(client);
                    recv_client->send_buffer.push(temp_str);

                    //pack text
                    temp_str = pack_Text(client);
                    recv_client->send_buffer.push(temp_str);

                    //erase recv user
                    message_ptoa.user_name_list_.erase(iter);
                }
            }
            //private chat
            else{
                //use message_ptoa.user_name_ to find the recv_client          
                client_name = message_ptoa.user_name_;
                recv_client = TransLayerInstance.find_by_username(client_name);
                
                //recv client off line
                if(recv_client == NULL)
                    return StatusCode::OK;

                //pack text user name
                temp_str = pack_TextUserName(client);
                recv_client->send_buffer.push(temp_str);

                //pack text
                temp_str = pack_Text(client);
                recv_client->send_buffer.push(temp_str);
            }

            return StatusCode::OK;
        }//end of Text
    }

    //WaitForText:
    if((client->state == SessionState::WaitForText) )
        return StatusCode::OK;


    //file
    // if((message.type_ == FileName) || (message.type_ == FileInProgress)
    //     || (message.type_ == FileEnd) || (message.type_ == FileUsername) ){
    //     temp_str = pack_String(message);
    // }
    return StatusCode::OK; 
}

StatusCode PresentationLayer::unpack_DataPacket(Client *client){
    Message_To_Pre message_atop;
    while( client->recv_buffer.has_complete_packet()){
        //client->recv_buffer.has_complete_packet()
        DataPacket packet;
        Message_To_App message;
        unsigned char *temp_data;

        packet = client->recv_buffer.dequeue_packet();
        packet_size = packet.data.size() + 3;

        //start unpacking 
        if((packet.type == PacketType::Info) || (packet.type == PacketType::Password)
            || (packet.type == PacketType::HistoryUserName) || (packet.type == PacketType::History)
            || (packet.type == PacketType::TextUsername) || (packet.type == PacketType::Text)
            || (packet.type == PacketType::FileUsername) || (packet.type == PacketType::FileName)
            || (packet.type == PacketType::FileInProgress) || (packet.type == PacketType::FileEnd) )
        {
            temp_data = unpack_String(packet);
            switch(packet.type){
                case PacketType::Info:
                    client->message_ptoa.user_name_ = (char *)temp_data;
                    break;
                case PacketType::Password:
                    client->message_ptoa.password_ = (char *)temp_data;
                    break;
                case PacketType::HistoryUserName:
                    client->message_ptoa.user_name_ = (char *)temp_data;
                    break;
                case PacketType::History:
                    client->message_ptoa.media_text_ = (char *)temp_data;
                    break;
                case PacketType::TextUsername:
                    client->message_ptoa.user_name_ = (char *)temp_data;
                    break;
                case PacketType::Text:
                    client->message_ptoa.media_text_ = (char *)temp_data;
                    break;
                case PacketType::FileUsername:
                    client->message_ptoa.user_name_ = (char *)temp_data;
                    break;
                case PacketType::FileName:
                    client->message_ptoa.file_name_ = (char *)temp_data;
                    break;
                case PacketType::FileInProgress:
                    client->message_ptoa.media_file_ = (char *)temp_data;
                    break;
                case PacketType::FileEnd:                
                    client->message_ptoa.media_file_ = (char *)temp_data;
                    break;
                default:
                    break;
            }
        }//end of if
     
        if(packet.type == PacketType::Password){
            temp_data = unpack_String(packet);
            if(check_passwordFormat(temp_data) == false){
                message_atop.type_ = PacketType::PasswordResponse;
                message_atop.respond_ = ResponseType::WrongPassword;
                client->send_buffer.push(pack_Response(message_atop));
                return StatusCode::OK;
            }
            //valid password format
            client->message_ptoa.password_ = (char *)temp_data;
        }

        if(packet.type == PacketType::Configuration){
                message = unpack_Configuration(packet);
                client->message_ptoa.config_ = message.config_;
        }

        if(packet.type == PacketType::GroupTextUserlist){
                message = unpack_GroupTextUserList(packet);
                client->message_ptoa.user_name_list_ = message.user_name_list_;
        }

        client->message_ptoa.type_ = packet.type;
        // cout << (packet.type == PacketType::Password) << endl;
        // cout << (client->message_ptoa.type_ == PacketType::Password) << endl;
    
        // cout << client->message_ptoa.user_name_ << endl;
        // cout << &client << endl;
        // cout << "debug2" << endl;
        AppLayerInstance.MessageToApp(client);
    }
    return StatusCode::OK;
}

unsigned char * PresentationLayer::unpack_String(DataPacket packet){
    vector<uint8_t>::iterator iter;
    static unsigned char temp[kMaxPacketLength];

    int data_len = 0;
    for(iter = packet.data.begin(); iter != packet.data.end(); iter++){
        temp[data_len++] = *iter;
    }
    temp[data_len] = '\0';
    
    return temp;
}

Message_To_App PresentationLayer::unpack_Configuration(DataPacket packet){
    Message_To_App message;
    vector<uint8_t>::iterator iter;
    unsigned short st;   

    iter = packet.data.begin();
    st = (unsigned short)(*iter);
    st = st << 8;
    st += (unsigned short)(*(++iter));
    message.config_ = ntohs(st);

    return message;
}

Message_To_App PresentationLayer::unpack_GroupTextUserList(DataPacket packet){
    Message_To_App message;
    vector<uint8_t>::iterator iter;
    string temp_str;
    unsigned char temp_ch[30]; //max user name length = 28

    int len = 0;
    iter = packet.data.begin();

    //write user_name_list_
    for( ; iter != packet.data.end(); iter++){
        temp_ch[len++] = *iter; 
        //if encountered '\0'
        if((*iter) == '\0'){
            temp_str = (char *)temp_ch;
            //push_back a new user_name
            message.user_name_list_.push_back(temp_str);
            len = 0;    //reset len = 0, and fetch the next user_name
        }
    }

    //add \0 to the last user_name in the user_name_list
    temp_ch[len] = '\0';
    temp_str = (char *)temp_ch;
    //push_back a new user_name
    message.user_name_list_.push_back(temp_str);

    return message;
}

#endif
