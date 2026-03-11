package com.localcontrol.udp;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * UdpPlugin - Capacitor 커스텀 UDP 플러그인
 *
 * LifeSmart Local Protocol과 UDP 통신을 수행한다.
 * sendAndReceive: 단발성 요청/응답
 * broadcast: 브로드캐스트 후 다수 응답 수집 (Discovery)
 * startListen: 지정 포트에서 NOTIFY 패킷 수신
 * stopListen: 수신 중지
 */
@CapacitorPlugin(name = "UdpPlugin")
public class UdpPlugin extends Plugin {

    private final ExecutorService taskPool = Executors.newCachedThreadPool();
    private DatagramSocket listenSocket = null;
    private volatile boolean listening = false;

    @PluginMethod
    public void sendAndReceive(PluginCall call) {
        String host = call.getString("host");
        int port = call.getInt("port", 12348);
        JSArray dataArr = call.getArray("data");
        int timeoutMs = call.getInt("timeoutMs", 5000);

        if (host == null || dataArr == null) {
            call.reject("host and data are required");
            return;
        }

        taskPool.execute(() -> {
            DatagramSocket socket = null;
            try {
                byte[] buf = toByteArray(dataArr);
                socket = new DatagramSocket();
                socket.setSoTimeout(timeoutMs);

                DatagramPacket sendPkt = new DatagramPacket(
                    buf, buf.length,
                    InetAddress.getByName(host), port
                );
                socket.send(sendPkt);

                byte[] recv = new byte[65535];
                DatagramPacket recvPkt = new DatagramPacket(recv, recv.length);
                socket.receive(recvPkt);

                JSObject result = new JSObject();
                result.put("data", toJSArray(recvPkt.getData(), recvPkt.getLength()));
                result.put("remoteIp", recvPkt.getAddress().getHostAddress());
                result.put("remotePort", recvPkt.getPort());
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage());
            } finally {
                if (socket != null && !socket.isClosed()) {
                    socket.close();
                }
            }
        });
    }

    @PluginMethod
    public void broadcast(PluginCall call) {
        int broadcastPort = call.getInt("broadcastPort", 12345);
        JSArray dataArr = call.getArray("data");
        int listenPort = call.getInt("listenPort", 12346);
        int timeoutMs = call.getInt("timeoutMs", 3000);

        if (dataArr == null) {
            call.reject("data is required");
            return;
        }

        taskPool.execute(() -> {
            DatagramSocket socket = null;
            try {
                byte[] buf = toByteArray(dataArr);
                socket = new DatagramSocket(listenPort);
                socket.setBroadcast(true);
                socket.setSoTimeout(timeoutMs);

                // 브로드캐스트 전송
                DatagramPacket sendPkt = new DatagramPacket(
                    buf, buf.length,
                    InetAddress.getByName("255.255.255.255"), broadcastPort
                );
                socket.send(sendPkt);

                // 다수 응답 수집
                List<JSObject> results = new ArrayList<>();
                byte[] recv = new byte[65535];

                try {
                    while (true) {
                        DatagramPacket recvPkt = new DatagramPacket(recv, recv.length);
                        socket.receive(recvPkt);

                        JSObject item = new JSObject();
                        item.put("data", toJSArray(recvPkt.getData(), recvPkt.getLength()));
                        item.put("remoteIp", recvPkt.getAddress().getHostAddress());
                        item.put("remotePort", recvPkt.getPort());
                        results.add(item);
                    }
                } catch (SocketTimeoutException e) {
                    // 타임아웃 = 수집 완료
                }

                JSObject response = new JSObject();
                JSONArray arr = new JSONArray();
                for (JSObject r : results) {
                    arr.put(r);
                }
                response.put("results", arr);
                call.resolve(response);
            } catch (Exception e) {
                call.reject(e.getMessage());
            } finally {
                if (socket != null && !socket.isClosed()) {
                    socket.close();
                }
            }
        });
    }

    @PluginMethod
    public void startListen(PluginCall call) {
        int port = call.getInt("port", 12346);

        if (listening) {
            call.resolve();
            return;
        }

        taskPool.execute(() -> {
            try {
                listenSocket = new DatagramSocket(port);
                listenSocket.setSoTimeout(1000); // 1초마다 체크
                listening = true;
                call.resolve();

                byte[] recv = new byte[65535];
                while (listening) {
                    try {
                        DatagramPacket recvPkt = new DatagramPacket(recv, recv.length);
                        listenSocket.receive(recvPkt);

                        JSObject event = new JSObject();
                        event.put("data", toJSArray(recvPkt.getData(), recvPkt.getLength()));
                        event.put("remoteIp", recvPkt.getAddress().getHostAddress());
                        event.put("remotePort", recvPkt.getPort());
                        notifyListeners("udpMessage", event);
                    } catch (SocketTimeoutException e) {
                        // 타임아웃 무시, 다시 수신 대기
                    }
                }
            } catch (Exception e) {
                listening = false;
                // 이미 resolve된 이후의 에러는 로깅만
                android.util.Log.e("UdpPlugin", "Listen error: " + e.getMessage());
            } finally {
                if (listenSocket != null && !listenSocket.isClosed()) {
                    listenSocket.close();
                }
            }
        });
    }

    @PluginMethod
    public void stopListen(PluginCall call) {
        listening = false;
        if (listenSocket != null && !listenSocket.isClosed()) {
            listenSocket.close();
        }
        call.resolve();
    }

    // ─── Helper ───

    private byte[] toByteArray(JSArray arr) throws JSONException {
        JSONArray jsonArr = arr.toList() != null
            ? new JSONArray(arr.toList())
            : new JSONArray();
        byte[] bytes = new byte[jsonArr.length()];
        for (int i = 0; i < jsonArr.length(); i++) {
            bytes[i] = (byte) jsonArr.getInt(i);
        }
        return bytes;
    }

    private JSONArray toJSArray(byte[] data, int length) {
        JSONArray arr = new JSONArray();
        for (int i = 0; i < length; i++) {
            arr.put(data[i] & 0xFF);
        }
        return arr;
    }
}
